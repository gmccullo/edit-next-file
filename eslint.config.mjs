import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import promise from "eslint-plugin-promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all
});

const rules =
	[
		// inherit rule sets
		...compat.extends(
			"eslint:recommended",
			"plugin:@typescript-eslint/recommended",)
			.map(config => (
				{
					...config,
					files:
						[
							"**/*.ts",
							"**/*.tsx"
						],
				})),
		// ignore paths
		{
			ignores:
				[
					"**/out",
					"**/dist",
					"**/*.d.ts",
					"**/node_modules"
				],
		},
		// options
		{
			files:
				[
					"**/*.ts",
					"**/*.tsx"
				],
			plugins:
			{
				"@typescript-eslint": typescriptEslint,
				"promise": promise,
			},
			languageOptions:
			{
				globals:
				{
					...globals.node,
					...globals.mocha,
					NodeJS: "readonly",
					mocha: "readonly",
				},
				parser: tsParser,
				ecmaVersion: "latest",
				sourceType: "module",
				parserOptions:
				{
					project:
						[
							path.resolve(__dirname, './tsconfig.json'),
							path.resolve(__dirname, './tsconfig.test.json'),
						],
				},
			},
			rules:
			{
				// "no-extra-parens":
				// 	[
				// 		"error",
				// 		"all"
				// 	],
				// "@typescript-eslint/prefer-readonly-parameter-types": "error",
				"@typescript-eslint/explicit-module-boundary-types": "error",
				"@typescript-eslint/no-unused-vars":
					[
						"warn",
						{
							varsIgnorePattern: "^Array$",
						}
					],
				"@typescript-eslint/naming-convention":
					[
						"warn",
						{
							selector: "variable",
							format: ["camelCase", "UPPER_CASE"],
						},
						{
							selector: "function",
							format: ["camelCase"],
						}, {
							selector: "interface",
							format: ["PascalCase"],
							prefix: ["I"],
						}, {
							selector: "class",
							format: ["PascalCase"],
						}, {
							selector: "import",
							format: ["camelCase", "PascalCase"],
						}
					],
				"curly": "warn",
				"eqeqeq": "warn",
				"no-throw-literal": "warn",
				"no-extra-semi": "warn",
				// Add promise plugin rules
				"promise/always-return": "error",
				"promise/no-return-wrap": "error",
				"promise/param-names": "error",
				"promise/catch-or-return": "error",
				"promise/no-nesting": "warn",
				"promise/no-promise-in-callback": "warn",
				"promise/no-callback-in-promise": "warn",
				"promise/avoid-new": "warn",
				// Add the @typescript-eslint/await-thenable rule
				"@typescript-eslint/await-thenable": "error",
				"@typescript-eslint/require-await": "error",
				// turn off truthiness
				"no-implicit-coercion":
					[
						"error",
						{
							"allow": []
						}
					],
				// "@typescript-eslint/no-non-null-assertion": "warn",
				"@typescript-eslint/strict-boolean-expressions":
					[
						"error",
						{
							"allowAny": false,
							"allowNullableBoolean": false,
							"allowNullableNumber": false,
							"allowNullableObject": false,
							"allowNullableString": false,
							"allowNumber": false,
							"allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing": false,
							"allowString": false,
						}
					],
				"@typescript-eslint/explicit-function-return-type": [
					"error",
					// {
					// 	"allowExpressions": false,
					// 	"allowTypedFunctionExpressions": false,
					// 	"allowHigherOrderFunctions": false,
					// 	"allowFunctionsWithoutTypeParameters": true,
					// }
				],
			},
		}
	];

export default rules;
