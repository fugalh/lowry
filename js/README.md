test: jest
build: npx webpack
preview: npx http-server ./dist
distribute: npx webpack --mode production

6MB is kind of ridiculous but we can probably make vega and math.js external
