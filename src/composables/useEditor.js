import { ref, watch, nextTick, onMounted } from 'vue'

export function useEditor(form, isTranslating = null) {
    const textareaRef = ref(null)

    function autoResize() {
        const el = textareaRef.value
        if (!el) return
        
        // If translating/streaming, avoid resetting height to 'auto' to prevent scroll jumps
        // We assume content is only growing during translation
        if (!isTranslating?.value) {
            el.style.height = 'auto'
        }
        el.style.height = el.scrollHeight + 'px'
    }

    // Watch for content changes to auto-resize
    watch(() => form.value.content, async () => {
        await nextTick()
        autoResize()
    })
    
    // Initial resize
    onMounted(async () => {
        await nextTick()
        autoResize()
    })

    function insertText(prefix, suffix = '') {
        const el = textareaRef.value
        if (!el) return
        
        const start = el.selectionStart
        const end = el.selectionEnd
        const text = form.value.content
        const before = text.substring(0, start)
        const selection = text.substring(start, end)
        const after = text.substring(end)
        
        form.value.content = before + prefix + selection + suffix + after
        
        // Restore cursor / selection
        nextTick(() => {
            el.focus()
            el.setSelectionRange(start + prefix.length, end + prefix.length)
            autoResize()
        })
    }

    function clearEditor() {
        if (form.value.content && confirm('Clear all content?')) {
            form.value.content = ''
        }
    }

    return {
        textareaRef,
        autoResize,
        insertText,
        clearEditor
    }
}
