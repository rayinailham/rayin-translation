<template>
  <footer class="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 transition-colors">
    <div class="max-w-7xl mx-auto px-4 py-10">

      <!-- Top row -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Brand -->
        <router-link to="/" class="flex items-center gap-2 text-sm font-bold tracking-tight text-neutral-800 dark:text-neutral-200 hover:opacity-70 transition">
          <img src="/Logo Rayin Translation.png" alt="Rayin Translation" class="h-5 w-5 object-contain" />
          Rayin Translation
        </router-link>

        <!-- Tagline -->
        <p class="text-xs text-neutral-400 dark:text-neutral-600 text-center">
          Free fan translations of web novels.
        </p>
      </div>

      <!-- Divider -->
      <div class="border-t border-neutral-200 dark:border-neutral-800 my-6" />

      <!-- Bottom row -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-[13px] text-neutral-400 dark:text-neutral-600">
        <span>© {{ new Date().getFullYear() }} Rayin Translation — All original works belong to their respective authors &amp; publishers.</span>
        <span class="hidden sm:inline">·</span>
        <span>For personal reading only.</span>
      </div>
    </div>
  </footer>
</template>
