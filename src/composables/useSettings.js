import { ref } from 'vue'
import { supabase } from '../supabase'
import { logger } from '../utils/logger'

const DEFAULT_AI_SETTINGS = Object.freeze({
    temperature: 0.7,
    top_p: 1.0,
    top_k: 0,
    max_tokens: 8192,
    reasoning: false,
    model: 'openrouter/pony-alpha',
    system_prompt: '',
})

export function useSettings(novel) {
    const presetsList = ref([])
    const activePresetId = ref(null)
    const showPromptEditor = ref(false)
    const savingPreset = ref(false)
    
    const aiSettings = ref({ ...DEFAULT_AI_SETTINGS })

    async function loadPresets() {
        const { data } = await supabase
            .from('translation_settings')
            .select('*')
            .order('is_default', { ascending: false })
            .order('name')
        presetsList.value = data || []
        
        logger.preset('Loaded List', { count: presetsList.value.length })

        // Auto-select: novel-specific first, then default
        if (data && data.length > 0) {
            const novelPreset = novel.value ? data.find(p => p.novel_id === novel.value.id) : null
            const defaultPreset = data.find(p => p.is_default)
            const preset = novelPreset || defaultPreset || data[0]
            applyPreset(preset)
        }
    }

    function applyPreset(preset) {
        if (!preset) return
        activePresetId.value = preset.id
        aiSettings.value = {
            temperature: preset.temperature,
            top_p: preset.top_p,
            top_k: preset.top_k,
            max_tokens: preset.max_tokens,
            reasoning: preset.reasoning,
            model: preset.model || 'openrouter/pony-alpha',
            system_prompt: preset.system_prompt || '',
        }
        logger.preset('Applied', { id: preset.id, name: preset.name })
    }

    function handlePresetChange(event) {
        const id = event.target.value
        if (id === '__new__') {
            activePresetId.value = null
            aiSettings.value = { ...DEFAULT_AI_SETTINGS }
            showPromptEditor.value = true
            logger.preset('New Preset Selected')
            return
        }
        const preset = presetsList.value.find(p => p.id === id)
        if (preset) applyPreset(preset)
    }

    async function saveCurrentPreset() {
        savingPreset.value = true
        try {
            // Refresh auth session in case token expired during long translation
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) {
                console.warn('Session refresh warning:', refreshError.message)
            }

            const payload = {
                system_prompt: aiSettings.value.system_prompt,
                model: aiSettings.value.model,
                temperature: aiSettings.value.temperature,
                top_p: aiSettings.value.top_p,
                top_k: aiSettings.value.top_k,
                max_tokens: aiSettings.value.max_tokens,
                reasoning: aiSettings.value.reasoning,
                updated_at: new Date().toISOString(),
            }
            
            logger.preset('Saving...', payload)
    
            if (activePresetId.value) {
                // Update existing
                const { error } = await supabase
                    .from('translation_settings')
                    .update(payload)
                    .eq('id', activePresetId.value)
                if (error) throw error
                
                // Update local list
                const idx = presetsList.value.findIndex(p => p.id === activePresetId.value)
                if (idx !== -1) {
                    presetsList.value[idx] = { ...presetsList.value[idx], ...payload }
                }
                logger.preset('Updated existing', { id: activePresetId.value })
            } else {
                // Create new
                const name = prompt('Preset name (e.g. "casual", "formal"):')
                if (!name) { savingPreset.value = false; return }
                
                payload.name = name
                payload.novel_id = novel.value?.id || null
                payload.is_default = false

                const { data, error } = await supabase
                    .from('translation_settings')
                    .insert(payload)
                    .select()
                if (error) throw error
                
                if (data?.[0]) {
                    presetsList.value.push(data[0])
                    activePresetId.value = data[0].id
                    // Sort list to keep consistent (Default first, then Name)
                    presetsList.value.sort((a, b) => {
                         if (a.is_default === b.is_default) return a.name.localeCompare(b.name)
                         return a.is_default ? -1 : 1
                    })
                    logger.preset('Created new', { id: data[0].id, name })
                }
            }
        } catch (e) {
            alert('Save failed: ' + e.message)
            logger.error('Preset Save Failed', e)
        } finally {
            savingPreset.value = false
        }
    }

    async function deletePreset() {
        if (!activePresetId.value) return
        const preset = presetsList.value.find(p => p.id === activePresetId.value)
        if (preset?.is_default) { alert('Cannot delete the default preset.'); return }
        if (!confirm(`Delete preset "${preset?.name}"?`)) return
        
        const { error } = await supabase.from('translation_settings').delete().eq('id', activePresetId.value)
        if (error) { alert(error.message); return }
        
        logger.preset('Deleted', { id: activePresetId.value, name: preset?.name })
        
        activePresetId.value = null
        await loadPresets()
    }

    function resetToDefault() {
        const defaultPreset = presetsList.value.find(p => p.is_default)
        if (defaultPreset) {
            applyPreset(defaultPreset)
        } else {
            aiSettings.value = { ...DEFAULT_AI_SETTINGS }
            activePresetId.value = null
        }
        logger.preset('Reset to Default')
    }

    return {
        presetsList,
        activePresetId,
        aiSettings,
        showPromptEditor,
        savingPreset,
        loadPresets,
        applyPreset,
        handlePresetChange,
        saveCurrentPreset,
        deletePreset,
        resetToDefault
    }
}
