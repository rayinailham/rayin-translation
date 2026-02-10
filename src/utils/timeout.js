/**
 * Wraps a promise with a timeout. If the promise doesn't resolve
 * within the given milliseconds, it rejects with a timeout error.
 * 
 * @param {Promise} promise - The promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} [label] - Optional label for the timeout error message
 * @returns {Promise}
 */
export function withTimeout(promise, ms, label = 'Operation') {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`${label} timed out after ${ms / 1000}s`))
        }, ms)

        promise
            .then((result) => {
                clearTimeout(timer)
                resolve(result)
            })
            .catch((err) => {
                clearTimeout(timer)
                reject(err)
            })
    })
}

/**
 * Attempt a Supabase auth session refresh with a timeout.
 * If it fails or times out, logs a warning but does NOT throw.
 * This prevents saves from getting stuck when auth is slow.
 * 
 * @param {object} supabase - The Supabase client
 * @param {number} [timeoutMs=5000] - Timeout in milliseconds
 */
export async function safeRefreshSession(supabase, timeoutMs = 5000) {
    try {
        const { error } = await withTimeout(
            supabase.auth.refreshSession(),
            timeoutMs,
            'Session refresh'
        )
        if (error) {
            console.warn('[Auth] Session refresh warning:', error.message)
        }
    } catch (e) {
        console.warn('[Auth] Session refresh skipped:', e.message)
        // Don't throw — we still want to attempt the save
    }
}
