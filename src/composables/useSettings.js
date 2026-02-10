import { ref } from 'vue'
import { supabase } from '../supabase'

export function useSettings(novel) {
    const presetsList = ref([])
    const activePresetId = ref(null)
    const showPromptEditor = ref(false)
    const savingPreset = ref(false)
    
    const aiSettings = ref({
        temperature: 0.7,
        top_p: 1.0,
        top_k: 0,
        max_tokens: 8192,
        reasoning: false,
        model: 'openrouter/pony-alpha',
        system_prompt: '',
    })

    async function loadPresets() {
        const { data } = await supabase
            .from('translation_settings')
            .select('*')
            .order('is_default', { ascending: false })
            .order('name')
        presetsList.value = data || []
        
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
    }

    function handlePresetChange(event) {
        const id = event.target.value
        if (id === '__new__') {
            activePresetId.value = null
            aiSettings.value = {
                temperature: 0.7,
                top_p: 1.0,
                top_k: 0,
                max_tokens: 8192,
                reasoning: false,
                model: 'openrouter/pony-alpha',
                system_prompt: '',
            }
            showPromptEditor.value = true
            return
        }
        const preset = presetsList.value.find(p => p.id === id)
        if (preset) applyPreset(preset)
    }

    async function saveCurrentPreset() {
        savingPreset.value = true
        try {
            const payload = {
                system_prompt: aiSettings.value.system_prompt,
                model: aiSettings.value.model,
                temperature: aiSettings.value.temperature,
                top_p: aiSettings.value.top_p,
                top_k: aiSettings.value.top_k,
                max_tokens: aiSettings.value.max_tokens,
                reasoning: aiSettings.value.reasoning,
                updated_at: new Date(),
            }
    
            if (activePresetId.value) {
                // Update existing
                const { error } = await supabase
                    .from('translation_settings')
                    .update(payload)
                    .eq('id', activePresetId.value)
                if (error) throw error
            } else {
                // Create new
                const name = prompt('Preset name (e.g. "casual", "formal"):')
                if (!name) { savingPreset.value = false; return }
                payload.name = name
                payload.novel_id = novel.value?.id || null
                const { data, error } = await supabase
                    .from('translation_settings')
                    .insert(payload)
                    .select()
                if (error) throw error
                if (data?.[0]) activePresetId.value = data[0].id
            }
    
            await loadPresets()
        } catch (e) {
            alert('Save failed: ' + e.message)
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
        activePresetId.value = null
        await loadPresets()
    }

    function resetToDefault() {
        const defaultPreset = presetsList.value.find(p => p.is_default)
        if (defaultPreset) {
            applyPreset(defaultPreset)
        } else {
            // Fallback if no default preset exists
            aiSettings.value = {
                temperature: 0.7,
                top_p: 1.0,
                top_k: 0,
                max_tokens: 8192,
                reasoning: false,
                model: 'openrouter/pony-alpha',
                system_prompt: '',
            }
            activePresetId.value = null
        }
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
