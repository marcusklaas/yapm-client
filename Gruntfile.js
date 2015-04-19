module.exports = function(grunt) {

    // Project configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        inline: {
            dist: {
                options: {
                    tag: ''
                },
                src: 'assets/index-tidied.html',
                dest: 'assets/index-inlined.html'
            }
        },

        uncss: {
            dist: {
                files: {
                    'assets/tidy.css': ['assets/index.html']
                }
            }
        },

        processhtml: {
            dist: {
                files: {
                    'assets/index-tidied.html': ['assets/index.html']
                }
            }
        },

        es6transpiler: {
            dist: {
                files: {
                    'assets/manager-es5.js': 'assets/manager-loaded.js',
                }
            }
        },

        uglify: {
            dist: {
                files: {
                    'assets/manager.min.js': ['assets/manager-es5.js']
                }
            }
        },

        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                    minifyCSS: true
                },
                files: {
                    'index.html': 'assets/index-inlined.html'
                }
            }
        },

        manifest: {
            generate: {
                options: {
                    basePath: './',
                    cache: [],
                    network: ['http://*', 'https://*'],
                    fallback: [],
                    exclude: [],
                    preferOnline: true,
                    verbose: false,
                    timestamp: true,
                    hash: false,
                    master: ['index.html']
                },
                src: [
                    'index.html'
                ],
                dest: 'manifest.appcache'
            }
        }
    });

    grunt.registerTask('load-js-modules', 'Bundles the es6 modules', function() {
        var transpiler = require('es6-module-transpiler');
        var Container = transpiler.Container;
        var FileResolver = transpiler.FileResolver;
        var BundleFormatter = transpiler.formatters.bundle;

        var container = new Container({
            resolvers: [new FileResolver(['assets/'])],
            formatter: new BundleFormatter()
        });

        container.getModule('manager');
        container.write('assets/manager-loaded.js');
    });

    grunt.registerTask('force-transpile', 'Transpile es6 while ignoring warnings', function () {
        var tasks = ['es6transpiler'];

        // Use the force option for all tasks declared in the previous line
        grunt.option('force', true);
        grunt.task.run(tasks);
    });

    grunt.loadNpmTasks('grunt-uncss');
    grunt.loadNpmTasks('grunt-inline-alt');
    grunt.loadNpmTasks('grunt-processhtml');
    grunt.loadNpmTasks('grunt-es6-transpiler');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-manifest');

    // Default task(s).
    grunt.registerTask('default', [
        'load-js-modules',
        'es6transpiler',
        'uglify',
        'uncss',
        'processhtml',
        'inline',
        'htmlmin',
        'manifest'
    ]);

};