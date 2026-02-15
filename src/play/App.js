import { Select, Alert, render, Pause } from '@nan0web/ui-cli'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { Runner } from './Runner.js'

export class PlayApp {
	/**
	 * @param {import('../server/AuthServer.js').default} server
	 * @param {import('../server/AuthServer.js').default['logger']} serverLogger
	 */
	constructor(server, serverLogger) {
		this.server = server
		this.logger = serverLogger
		this.baseUrl = `http://localhost:${server.port}`
		this.scenariosDir = resolve(process.cwd(), 'src/play/scenarios')
		this.runner = new Runner({ baseUrl: this.baseUrl, delay: 1000, db: server.db })
	}

	async main() {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const choice = await render(
				Select({
					message: 'Select Scenario',
					options: [
						...this.getScenarioChoices(),
						// { separator: true },
						{ label: 'Quit', value: 'quit' },
					],
				}),
			)

			if (choice === 'quit') {
				await this.server.stop()
				process.exit(0)
			}

			// Load scenario
			const scenarioPath = join(this.scenariosDir, choice)
			try {
				const steps = JSON.parse(readFileSync(scenarioPath, 'utf-8'))

				await render(
					Alert({
						title: `Running Scenario: ${choice}`,
						variant: 'info',
						children: `Steps: ${steps.length}`,
					}),
				)

				// Execute
				await this.runner.run(steps)

				await render(
					Pause({
						message: 'Scenario Completed. Press Enter to continue...',
					}),
				)
			} catch (/** @type {any} */ err) {
				await render(
					Alert({
						title: 'Error Loading Scenario',
						variant: 'error',
						children: err.message,
					}),
				)
			}
		}
	}

	getScenarioChoices() {
		try {
			console.log('[DEBUG] Looking for scenarios in:', this.scenariosDir)
			const files = readdirSync(this.scenariosDir).filter((f) => f.endsWith('.json'))
			console.log('[DEBUG] Files found:', files)
			return files.map((f) => ({
				label: f.replace('.json', ''),
				value: f,
			}))
		} catch (/** @type {any} */ err) {
			console.warn('Scenarios dir not found:', err.message)
			return []
		}
	}
}
