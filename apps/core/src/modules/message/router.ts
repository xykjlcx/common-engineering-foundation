import { listMessages } from './slices/list-messages.js';
import { getMessage } from './slices/get-message.js';
import { setMessageRead } from './slices/read-message.js';
import { setMessageArchived } from './slices/archive-message.js';
import { confirmMessageReceipt } from './slices/confirm-message.js';
import { readAll } from './slices/read-all-messages.js';
import { pending } from './slices/pending-messages.js';
import { unread } from './slices/unread-messages.js';
import { preferences } from './slices/get-preferences.js';
import { savePreferences } from './slices/save-preferences.js';

export const messageRouter = {
  list: listMessages,
  detail: getMessage,
  read: setMessageRead,
  archive: setMessageArchived,
  confirm: confirmMessageReceipt,
  readAll,
  pending,
  unread,
  preferences,
  savePreferences,
};
