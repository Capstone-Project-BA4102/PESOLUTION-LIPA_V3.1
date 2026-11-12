const { HttpError } = require('./domain.cjs');

function authentication(supabase) {
  return async (req, res, next) => {
    try {
      if (!supabase) throw new HttpError(503, 'Backend Supabase configuration is missing.');
      const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) throw new HttpError(401, 'Please sign in to continue.');
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) throw new HttpError(401, 'Your session is invalid or expired.');
      const user = data.user;
      let role = 'applicant';
      const result = await supabase.from('admins').select('id').eq('profile_id', user.id).maybeSingle();
      if (result.error) throw new HttpError(503, 'Unable to verify your account role.');
      if (result.data) role = 'admin';
      req.actor = { id: user.id, email: user.email, role };
      next();
    } catch (error) { next(error); }
  };
}

const requireRole = (...roles) => (req, res, next) => roles.includes(req.actor?.role)
  ? next() : next(new HttpError(403, 'Your account cannot perform this action.'));

async function applicantAccess(supabase, actor, applicantId) {
  if (actor.role === 'admin') return;
  const { data, error } = await supabase.from('applicants').select('id').eq('id', applicantId).eq('profile_id', actor.id).maybeSingle();
  if (error || !data) throw new HttpError(403, 'You can only access your own applicant records.');
}

module.exports = { authentication, requireRole, applicantAccess };
