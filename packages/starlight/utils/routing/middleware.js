import { klona } from 'klona/lite';
import { routeMiddleware } from 'virtual:starlight/route-middleware';

/**
 * Adds a deep clone of the passed `routeData` object to locals and then runs middleware.
 * @param context Astro context object
 * @param routeData Initial route data object to attach.
 */
export async function attachRouteDataAndRunMiddleware(context, routeData) {
	context.locals.starlightRoute = klona(routeData);
	const runner = new MiddlewareRunner(context, routeMiddleware);
	await runner.run();
}

/**
 * A middleware function wrapper that only allows a single execution of the wrapped function.
 * Subsequent calls to `run()` are no-ops.
 */
class MiddlewareRunnerStep {
	#callback;
	constructor(callback) {
		this.#callback = callback;
	}
	async run(context, next) {
		if (this.#callback) {
			await this.#callback(context, next);
			this.#callback = null;
		}
	}
}

/**
 * Class that runs a stack of middleware handlers with an initial context object.
 * Middleware functions can mutate properties of the `context` object, but cannot replace it.
 *
 * @example
 * const context = { value: 10 };
 * const timesTwo = async (ctx, next) => {
 *   await next();
 *   ctx.value *= 2;
 * };
 * const addFive = async (ctx) => {
 *   ctx.value += 5;
 * }
 * const runner = new MiddlewareRunner(context, [timesTwo, addFive]);
 * runner.run();
 * console.log(context); // { value: 30 }
 */
class MiddlewareRunner {
	#context;
	#steps;

	constructor(
		/** Context object passed as the first argument to each middleware function. */
		context,
		/** Array of middleware functions to run in sequence. */
		stack = []
	) {
		this.#context = context;
		this.#steps = stack.map((callback) => new MiddlewareRunnerStep(callback));
	}

	async #stepThrough(steps) {
		let currentStep;
		while (steps.length > 0) {
			[currentStep, ...steps] = steps;
			await currentStep.run(this.#context, async () => this.#stepThrough(steps));
		}
	}

	async run() {
		await this.#stepThrough(this.#steps);
	}
}
