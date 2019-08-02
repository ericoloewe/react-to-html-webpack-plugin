# React To Static Html Webpack Plugin

```
npm install react-to-static-html-webpack-plugin
```

## Introduction

This project was created to generate a html (templates) file from your react webpack entry

### Example

You can try this package cloning the repository and accessing the folder `example/`

## Getting Started

:warning: every config is optional

```javascript
// webpack.config.js
const ReactToHtmlWebpackPlugin = require("react-to-html-webpack-plugin");

module.exports = {
    // ...your webpack config
    plugins: [
        new ReactToHtmlWebpackPlugin({
            globals = // {custom-global-object}
            htmlHeader = // "custom => <!DOCTYPE html>";
            chunks = // custom allowed chunks => ['<my-chunk>'];
            excludedChunks = // custom excluded chunks => ['<my-chunk>'];
            postRender = // custom post render method => [(content) => content]
            keepJsFile = // keep generated js file (not just the parsed html file)
        });
    ]
    // ...your webpack config
}
```

## Build and Test

No build needed

## Contribute

### Commit Guidelines

My commits convention is based at [AngularJs Commits Convention](https://github.com/angular/angular.js/blob/master/CONTRIBUTING.md#commit)
