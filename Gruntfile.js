module.exports = function(grunt) {
    grunt.initConfig({
        compass: {
            dist: {
                options: {
                    sassDir: 'css',
                    cssDir: 'css'
                }
            }
        },

        watch: {
            css: {
                files: ['css/*.scss'],
                tasks: ['compass'],
                options: {
                    livereload: true
                }
            },
            scripts: {
                files: ['js/*.js'],
                options: {
                    livereload: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-compass');

    grunt.registerTask('default', ['watch']);
};