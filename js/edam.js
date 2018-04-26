(function ( $ ) {

    $.fn.edamData = null;

    $.ajax({
        dataType: "json",
        url: "edam.json",
        async: false,
        success: function(data) {
            $.fn.edamData = data;
        }
    });

    $.fn.edam = function( options ) {

        var $el = this;
        var $input = $el.find("input");
        var $termsWrap = $el.find("ul.terms");

        // get params, here are the defaults
        var settings = $.extend({
            types: null,
            level: 0
        }, options );

        $input.on('keyup', function(e) {

            $termsWrap.html();

            var root_id = Object.keys($.fn.edamData)[0];
            var root_data = $.fn.edamData[root_id];

            var $terms = renderTerm(root_id, root_data, 0, $input.val());

            $termsWrap.append($terms);

        });


        var root_id = Object.keys($.fn.edamData)[0];
        var root_data = $.fn.edamData[root_id];

        var $terms = renderTerm(root_id, root_data, 0);

        function renderTerm(id, data, level) {
            var $ul = $("<ul />");
            var children = data.children;

            if (children) {

                var i, len = children.length;
                for (i = 0; i < len; i += 1) {

                    var $li = $("<li />");

                    var key = Object.keys(children[i])[0];
                    var value = children[i][key];

                    var label = value.label || "";

                    if (settings.types && level === 0) {
                        if (settings.types.indexOf(label) > -1) {
                            // types are defined and this label is in types
                        } else {
                            // types are defined, but this item isn't in types
                            continue;
                        }
                    } else {
                        // types are not defined (all types)
                    }

                    if ($input.) {

                    }

                    $li.text(label);

                    if (level < settings.level) {
                        $li.append(
                            renderTerm(key, value, level + 1)
                        );
                    }

                    $ul.append($li);
                }
            }

            return $ul;
        }


        return this.find("ul.terms").append($terms);

    };

}( jQuery ));

/*

term -> "term_url" : {

}

 */