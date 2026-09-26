<template>
    <fieldset class="theme-picker">
        <legend>{{ $t('theme-gallery-title') }}</legend>
        <p class="theme-picker-description">{{ $t('theme-gallery-description') }}</p>
        <div class="theme-grid">
            <label v-for="theme in colorThemes" :key="theme.value" class="theme-choice"
                :class="{ selected: modelValue === theme.value }"
                :style="{ '--preview-accent': theme.accent, '--preview-bg': theme.background }">
                <input type="radio" name="color-theme" :value="theme.value" :checked="modelValue === theme.value"
                    @change="$emit('update:modelValue', theme.value)">
                <span class="theme-preview" aria-hidden="true">
                    <span class="preview-sidebar"><i></i><i></i><i></i></span>
                    <span class="preview-content"><i></i><span><i></i><i></i><i></i></span><i></i></span>
                    <span class="preview-player"><i></i></span>
                </span>
                <span class="theme-choice-label"><span>{{ $t(theme.label) }}</span><span class="theme-check" aria-hidden="true">{{ modelValue === theme.value ? '✓' : '' }}</span></span>
            </label>
        </div>
    </fieldset>
</template>

<script setup>
import { colorThemes } from '@/config/themes';
defineProps({ modelValue: { type: String, default: 'pink' } });
defineEmits(['update:modelValue']);
</script>

<style scoped>
.theme-picker { margin: 0 0 28px; padding: 0; border: 0; min-width: 0; }
legend { font-size: 19px; font-weight: 650; padding: 0; color: var(--text-color); }
.theme-picker-description { font-size: 13px; line-height: 1.7; color: var(--ui-muted); margin: 8px 0 18px; }
.theme-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.theme-choice { position: relative; display: block; min-width: 0; cursor: pointer; border: 1px solid var(--ui-border); border-radius: 14px; padding: 7px; background: var(--ui-surface); transition: border-color .18s, box-shadow .18s; }
.theme-choice:hover { border-color: var(--accent-ink); }
.theme-choice.selected { border-color: var(--accent-ink); box-shadow: 0 0 0 1px var(--accent-ink); }
.theme-choice:focus-within { outline: 3px solid var(--accent-ink); outline-offset: 3px; }
input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.theme-preview { display: flex; position: relative; height: 76px; overflow: hidden; border-radius: 8px; background: var(--preview-bg); }
.preview-sidebar { width: 24%; padding: 12px 5px; background: #ffffffa8; }
.preview-sidebar i { display: block; height: 3px; background: var(--preview-accent); border-radius: 3px; margin-bottom: 6px; opacity: .45; }
.preview-sidebar i:first-child { opacity: 1; }
.preview-content { flex: 1; padding: 12px 8px; }
.preview-content > i { display: block; height: 4px; width: 60%; border-radius: 3px; background: var(--preview-accent); }
.preview-content > span { display: flex; gap: 4px; margin: 8px 0; }
.preview-content > span i { width: 33%; height: 20px; background: var(--preview-accent); opacity: .25; border-radius: 4px; }
.preview-content > span i:first-child { opacity: .7; }
.preview-content > i:last-child { width: 80%; opacity: .2; }
.preview-player { position: absolute; inset: auto 0 0; height: 10px; background: #ffffffb8; display: grid; place-items: center; }
.preview-player i { width: 5px; height: 5px; border-radius: 50%; background: var(--preview-accent); }
.theme-choice-label { display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 9px 3px 2px; color: var(--text-color); font-size: 12px; line-height: 1.5; }
.theme-check { color: var(--accent-ink); font-weight: 700; }
.theme-picker:is(.dark .theme-picker) .theme-preview { background: #20242c; }
.theme-picker:is(.dark .theme-picker) .preview-sidebar, .theme-picker:is(.dark .theme-picker) .preview-player { background: #ffffff0d; }
@media (max-width: 900px) { .theme-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
