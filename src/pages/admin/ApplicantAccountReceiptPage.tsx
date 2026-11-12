// @ts-nocheck
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { KeyRound, Printer, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AccountReceiptSheet } from "@/components/admin/AccountReceiptSheet";
import {
  fetchApplicantAccountReceipts,
  fetchApplicantAccountSummary,
  issueApplicantCredential,
  type ApplicantAccountReceiptEvent,
  type NewApplicantCredential,
} from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import { printDocument } from "@/lib/print";
import { LoadingBlock, ErrorBlock } from "@/components/shared/QueryState";
import { usePT } from "@/lib/portalCopy";

export default function ApplicantAccountReceiptPage() {
  const pt = usePT();
  const { applicantId } = useParams();

  const fetcher = useCallback(() => fetchApplicantAccountSummary(applicantId), [applicantId]);
  const { data: applicant, loading, error, reload } = useQuery(fetcher);
  // The receipt table only exists after 20261023_applicant_account_receipts.sql runs, so a
  // failure falls back to the walk-in sheet fields instead of blocking the page.
  const receiptsQuery = useQuery(
    useCallback(() => fetchApplicantAccountReceipts(applicantId).catch(() => [] as ApplicantAccountReceiptEvent[]), [applicantId]),
  );

  const [ask, setAsk] = useState(false);
  const [issuing, setIssuing] = useState(false);
  // Held in memory only: a generated password is shown once for printing and then discarded.
  const [issued, setIssued] = useState<NewApplicantCredential | null>(null);

  const handlePrint = () => printDocument(`account-receipt-${applicant?.code || "applicant"}`);

  const handleIssue = async () => {
    setAsk(false);
    setIssuing(true);
    try {
      const result = await issueApplicantCredential(applicantId);
      setIssued(result);
      reload();
      receiptsQuery.reload();
      toast.success(pt("New initial password generated. Print this receipt now — it is shown only once."));
    } catch (e) {
      toast.error(e?.message || pt("The new password could not be generated."));
    } finally {
      setIssuing(false);
    }
  };

  if (loading) return <LoadingBlock label={pt("Loading applicant account receipt...")} />;
  if (error || !applicant) {
    return <ErrorBlock message={error || pt("Applicant not found.")} onRetry={reload} />;
  }

  const latest = (receiptsQuery.data ?? [])[0];
  const sheet = {
    fullName: applicant.fullName,
    code: applicant.code,
    email: applicant.email,
    password: issued?.initialPassword || "",
    issuedAt: issued?.issuedAt || latest?.created_at || applicant.dateRegistered,
    serial: issued?.receiptSerial || latest?.serial_number || "",
    passwordSet: !issued && Boolean(applicant.passwordChangedAt),
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden no-print">
        <PageHeader
          title="Account Receipt"
          description={pt("Portal login hand-over record for {name} ({code}).", { name: applicant.fullName, code: applicant.code })}
          back={{ to: "/admin/applicants", label: "Back to Applicants" }}
          actions={
            <div className="flex flex-wrap gap-3">
              <Button variant="neutral" onClick={() => setAsk(true)} disabled={issuing}>
                <KeyRound className="mr-2 h-4 w-4" /> {issuing ? pt("Generating...") : pt("Issue New Initial Password")}
              </Button>
              <Button variant="primary" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> {pt("Print Account Receipt")}
              </Button>
            </div>
          }
        />
        {issued ? (
          <p className="flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm font-medium text-warning-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {pt("Print this receipt before leaving the page. The password is generated for this printout, is never stored, and cannot be shown again. {name}'s previous password no longer works, and the portal will ask them to set their own password on the next sign-in.", { name: applicant.fullName })}
          </p>
        ) : (
          <p className={`text-sm font-medium ${applicant.passwordChangedAt ? "text-slate-600" : "text-warning-700"}`}>
            {applicant.passwordChangedAt
              ? pt("{name} ({code}) has already set a private password, so there is nothing left to print here. The hand-over record still proves when access was given.", { name: applicant.fullName, code: applicant.code })
              : pt("{name} ({code}) is still using the initial password printed on their receipt. That password was never stored, so use Issue New Initial Password to hand over a fresh receipt.", { name: applicant.fullName, code: applicant.code })}
          </p>
        )}
      </div>

      <AccountReceiptSheet receipt={sheet} />

      <Modal
        open={ask}
        onClose={() => setAsk(false)}
        title="Issue a new initial password?"
        footer={
          <>
            <Button variant="neutral" onClick={() => setAsk(false)}>Cancel</Button>
            <Button onClick={handleIssue}>Yes, generate a new password</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {pt("A new initial password is generated for")} <strong>{applicant.fullName}</strong>{" "}
          (<strong>{applicant.email}</strong>) {pt("and printed on a new serialised receipt.")}
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>{pt("The password {name} uses now stops working immediately, even if it was typed correctly before.", { name: applicant.fullName })}</li>
          <li>{pt("PESOLUTION never stores the new password, so print and hand over this receipt before leaving the page.")}</li>
          <li>{pt("{name} will be asked to set their own private password on the next sign-in before a referral can be requested.", { name: applicant.fullName })}</li>
        </ul>
      </Modal>
    </div>
  );
}
