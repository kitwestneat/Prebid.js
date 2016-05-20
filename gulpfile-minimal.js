'use strict';

var argv = require('yargs').argv;
var gulp = require('gulp');
var clean = require('gulp-clean');
var webpackConfig = require('./webpack.conf.js');
var replace = require('gulp-replace');
var webpack = require('webpack-stream');
var uglify = require('gulp-uglify');
var header = require('gulp-header');
/*
var gutil = require('gulp-util');
var connect = require('gulp-connect');
var jshint = require('gulp-jshint');
var karma = require('gulp-karma');
var opens = require('open');
var helpers = require('./gulpHelpers');
var del = require('del');
var gulpJsdoc2md = require('gulp-jsdoc-to-markdown');
*/

var CI_MODE = process.env.NODE_ENV === 'ci';
var prebid = require('./package.json');
var dateString = 'Updated : ' + (new Date()).toISOString().substring(0, 10);
var packageNameVersion = prebid.name + '_' + prebid.version;
var banner = '/* <%= prebid.name %> v<%= prebid.version %>\n' + dateString + ' */\n';

// Tasks
gulp.task('default', ['clean', 'webpack']);

gulp.task('build', ['clean', 'webpack', 'devpack' ]);

gulp.task('clean', function () {
  return gulp.src(['build'], {
      read: false
    })
    .pipe(clean());
});

gulp.task('devpack', function () {
  webpackConfig.devtool = 'source-map';
  return gulp.src(['src/prebid.js'])
    .pipe(webpack(webpackConfig))
    .pipe(replace('$prebid.version$', prebid.version))
    .pipe(gulp.dest('build/dev'))
});

gulp.task('webpack', function () {

  // change output filename if argument --tag given
  if (argv.tag && argv.tag.length) {
    webpackConfig.output.filename = 'prebid.' + argv.tag + '.js';
  }

  webpackConfig.devtool = null;

  return gulp.src(['src/prebid.js'])
    .pipe(webpack(webpackConfig))
    .pipe(replace('$prebid.version$', prebid.version))
    .pipe(uglify())
    .pipe(header(banner, { prebid: prebid }))
    .pipe(gulp.dest('build/dist'))
});
