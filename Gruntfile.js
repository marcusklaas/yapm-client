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
                    'assets/manager-es5.js': 'assets/manager.js'
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
        }
    });

    grunt.loadNpmTasks('grunt-uncss');
    grunt.loadNpmTasks('grunt-inline-alt');
    grunt.loadNpmTasks('grunt-processhtml');
    grunt.loadNpmTasks('grunt-es6-transpiler');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');

    // Default task(s).
    grunt.registerTask('default', [
        'es6transpiler',
        'uglify',
        'uncss',
        'processhtml',
        'inline',
        'htmlmin'
    ]);

};