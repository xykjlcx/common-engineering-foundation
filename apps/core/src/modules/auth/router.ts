import { changePassword } from './slices/change-password.js';
import { listSessions } from './slices/list-sessions.js';
import { login } from './slices/login.js';
import { logout } from './slices/logout.js';
import { me } from './slices/me.js';
import { revokeSession } from './slices/revoke-session.js';

export const authRouter = { login, logout, me, changePassword, listSessions, revokeSession };
