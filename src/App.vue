
<script setup>
import { onMounted } from 'vue'

function applyTheme(theme) {
  const html = document.documentElement
  if (
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
}

onMounted(() => {
  const theme = localStorage.getItem('theme') || 'system'
  applyTheme(theme)

  // Listen for OS-level changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = localStorage.getItem('theme') || 'system'
    if (current === 'system') applyTheme('system')
  })
})
</script>

<template>
  <router-view />
</template>
