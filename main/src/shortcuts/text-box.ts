import { uIOhook, UiohookKey as Key } from 'uiohook-napi'
import process from 'process';
import type { HostClipboard } from './HostClipboard'
import type { OverlayWindow } from '../windowing/OverlayWindow'

const PLACEHOLDER_LAST = '@last'
const AUTO_CLEAR = [
  '#', // Global
  '%', // Party
  '@', // Whisper
  '$', // Trade
  '&', // Guild
  '/' // Command
]

// Opening chat is asynchronous in PoE under Wine/Proton and takes longer while
// another in-game panel has focus. Let the chat edit control become active
// before sending Ctrl+V.
const LINUX_CHAT_FOCUS_DELAY = 150

export function typeInChat (text: string, send: boolean, clipboard: HostClipboard) {
  clipboard.restoreShortly((clipboard) => {
    const modifiers = process.platform === 'darwin' ? [Key.Meta] : [Key.Ctrl]

    const pasteAndSend = () => {
      uIOhook.keyTap(Key.V, modifiers)

      if (send) {
        uIOhook.keyTap(Key.Enter)
        // A slash command can trigger a zone change (/boat, /menagerie, /hideout,
        // /exit). The chat-restore sequence below fires microseconds after the
        // send, so it races the loading screen: the reopen lands, ArrowUp pulls
        // the just-sent command back out of chat history, and the closing Escape
        // gets swallowed -- leaving the command re-typed in an open chat box on
        // arrival. Commands have no half-typed message worth restoring anyway.
        if (text.startsWith('/')) return
        // restore the last chat
        uIOhook.keyTap(Key.Enter)
        uIOhook.keyTap(Key.ArrowUp)
        uIOhook.keyTap(Key.ArrowUp)
        uIOhook.keyTap(Key.Escape)
      }
    }

    if (text.startsWith(PLACEHOLDER_LAST)) {
      text = text.slice(`${PLACEHOLDER_LAST} `.length)
      clipboard.writeText(text)
      uIOhook.keyTap(Key.Enter, modifiers)
    } else if (text.endsWith(PLACEHOLDER_LAST)) {
      text = text.slice(0, -PLACEHOLDER_LAST.length)
      clipboard.writeText(text)
      uIOhook.keyTap(Key.Enter, modifiers)
      uIOhook.keyTap(Key.Home)
      // press twice to focus input when using controller
      uIOhook.keyTap(Key.Home)
      uIOhook.keyTap(Key.Delete)
    } else {
      clipboard.writeText(text)
      uIOhook.keyTap(Key.Enter)
      if (process.platform === 'linux') {
        setTimeout(() => {
          if (!AUTO_CLEAR.includes(text[0])) {
            uIOhook.keyTap(Key.A, modifiers)
          }
          pasteAndSend()
        }, LINUX_CHAT_FOCUS_DELAY)
        return
      }
      if (!AUTO_CLEAR.includes(text[0])) {
        uIOhook.keyTap(Key.A, modifiers)
      }
    }

    pasteAndSend()
  })
}

export function stashSearch (
  text: string,
  clipboard: HostClipboard,
  overlay: OverlayWindow
) {
  clipboard.restoreShortly((clipboard) => {
    overlay.assertGameActive()
    clipboard.writeText(text)
    uIOhook.keyTap(Key.F, [Key.Ctrl])
    uIOhook.keyTap(Key.V, [process.platform === 'darwin' ? Key.Meta : Key.Ctrl])
    uIOhook.keyTap(Key.Enter)
  })
}
