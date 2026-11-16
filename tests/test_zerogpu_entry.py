"""CPU-only tests of guards; do not import/download the hosted model."""
import ast
import asyncio
import hmac
from pathlib import Path
from types import SimpleNamespace
import unittest

SOURCE = Path(__file__).parents[1] / "sentiment-zerogpu-space" / "app.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
def load_function(name, namespace):
    node = next(node for node in TREE.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name)
    node.decorator_list = []
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), namespace)
    return namespace[name]

class Guards(unittest.TestCase):
    def test_all_queue_paths_require_key_but_status_is_public(self):
        calls = []
        async def next_handler(request):
            calls.append(request.url.path)
            return "allowed"
        fn = load_function("protect_inference", {"KEY": "synthetic-key", "hmac": hmac, "Request": object,
            "JSONResponse": lambda body, status_code: status_code})
        for path in ["/gradio_api/call/sentiment", "/gradio_api/call/sentiment/event", "/config", "/file=private"]:
            self.assertEqual(asyncio.run(fn(SimpleNamespace(url=SimpleNamespace(path=path), headers={}), next_handler)), 401)
        self.assertEqual(calls, [])
        for path in ["/", "/health", "/gradio_api/call/sentiment"]:
            self.assertEqual(asyncio.run(fn(SimpleNamespace(url=SimpleNamespace(path=path), headers={"x-pesolution-key":"synthetic-key"}), next_handler)), "allowed")

    def test_validation_happens_before_gpu_allocation(self):
        calls = []
        namespace = {"state": "ready", "gr": SimpleNamespace(Error=ValueError), "gpu_prediction": lambda text: calls.append(text) or {"label":"neutral"}}
        fn = load_function("classify", namespace)
        for text in ["", "   ", "a" * 4001]:
            with self.assertRaises(ValueError): fn(text)
        self.assertEqual(calls, [])
        self.assertEqual(fn(" synthetic "), {"label":"neutral"})
        self.assertEqual(calls, ["synthetic"])
        namespace["state"] = "error"
        with self.assertRaises(ValueError): fn("test")

    def test_public_app_does_not_use_the_reserved_worker_port(self):
        source = SOURCE.read_text(encoding="utf-8")
        launch = next(node for node in ast.walk(ast.parse(source)) if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "launch" and isinstance(node.func.value, ast.Name) and node.func.value.id == "demo")
        port = next(option.value for option in launch.keywords if option.arg == "server_port")
        self.assertIsInstance(port, ast.Constant)
        self.assertEqual(port.value, 7860)
        self.assertTrue(any(option.arg == "app_kwargs" for option in launch.keywords))
        self.assertTrue(any(option.arg == "ssr_mode" and isinstance(option.value, ast.Constant) and option.value.value is False for option in launch.keywords))
        self.assertNotIn("mount_gradio_app", source)
        self.assertIn("fix_mistral_regex=True", source)

    def test_zero_gpu_import_order_and_gpu_decorator(self):
        source = SOURCE.read_text(encoding="utf-8")
        self.assertLess(source.index("import spaces"), source.index("import torch"))
        gpu = next(node for node in ast.parse(source).body if isinstance(node, ast.FunctionDef) and node.name == "gpu_prediction")
        self.assertTrue(any(isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "GPU" for node in gpu.decorator_list))
        self.assertNotIn("from_pretrained", ast.unparse(gpu))

if __name__ == "__main__": unittest.main()
