import { browser } from 'webextension-polyfill-ts';

export const IDLE_MESSAGE_TYPE = 'runtime_msg_idle'

/**
 * Set a message listener, launching onTimeout when receive an IDLE_MESSAGE_TYPE
 * @param onTimeout the function to launch when the user is inactive or locks the screen
 */
export function setIdleAction(onTimeout: () => void) {
    browser.runtime.onMessage.addListener(function ({ type }) {
        if (type === IDLE_MESSAGE_TYPE) {
            // this will handle logout until the extension is closed
            onTimeout()
        }
    })
}