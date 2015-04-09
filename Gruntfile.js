module.exports = function(grunt) {

    // Project configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        inline: {
            dist: {
                options: {
                    tag: '',
                    inlineTagAttributes: {
                        js:  'type="application/javascript;version=1.8"',
                        css: ''
                    },
                    /* cssmin: true */
                },
                src: 'assets/index.html',
                dest: 'index.html'
            }
        }
    });

    grunt.loadNpmTasks('grunt-inline-alt');

    // Default task(s).
    grunt.registerTask('default', ['inline']);

};