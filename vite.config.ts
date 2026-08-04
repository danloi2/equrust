import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],

	build: {
		// JSXGraph is large (~600 kB minified) — raise the warning threshold
		chunkSizeWarningLimit: 800,

		rolldownOptions: {
			output: {
				// Keep jsxgraph in its own chunk so the app bundle stays lean
				manualChunks: (id: string) => {
					if (id.includes('jsxgraph')) return 'jsxgraph';
				}
			}
		}
	},

	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
