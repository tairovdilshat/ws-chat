import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" — сайт работает по любому адресу, в том числе /имя-репозитория/ на GitHub Pages
export default defineConfig({ plugins: [react()], base: "./" });
