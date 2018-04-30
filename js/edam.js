/**
 * Get all of an element's parent elements up the DOM tree until a matching parent is found
 * @param  {Node}   elem     The element
 * @param  {String} parent   The selector for the parent to stop at
 * @param  {String} selector The selector to filter against [optionals]
 * @return {Array}           The parent elements
 */
var getParentsUntil = function ( elem, parent, selector ) {

    // Element.matches() polyfill
    if (!Element.prototype.matches) {
        Element.prototype.matches =
            Element.prototype.matchesSelector ||
            Element.prototype.mozMatchesSelector ||
            Element.prototype.msMatchesSelector ||
            Element.prototype.oMatchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            function(s) {
                var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                    i = matches.length;
                while (--i >= 0 && matches.item(i) !== this) {}
                return i > -1;
            };
    }

    // Setup parents array
    var parents = [];

    // Get matching parent elements
    for ( ; elem && elem !== document; elem = elem.parentNode ) {

        if ( parent ) {
            if ( elem.matches( parent ) ) break;
        }

        if ( selector ) {
            if ( elem.matches( selector ) ) {
                parents.push( elem );
            }
            break;
        }

        parents.push( elem );

    }

    return parents;

};


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
        var $spinner = $el.find(".spinner");

        // get params, here are the defaults
        var settings = $.extend({
            types: null,
            level: null,
            disclosed: null
        }, options );

        var label, text, html, filter, result, synonyms, foundInSynonimsFlag, toFilter;
        var i, l, t;

        $input.on('keyup', function(e) {

            clearTimeout(t);
            $spinner.show();

            t = setTimeout(function() {
                $spinner.hide();

                $el.find('.term').each(function(i, node) {
                    label = node.firstChild;

                    text = label.innerText;
                    html = label.innerHTML;

                    filter = $input.val().split(' ').join('');
                    toFilter = filter && filter !== "";

                    if (toFilter) {
                        result = fuzzysort.single(filter, text, {threshold: -1000});
                        if (result) { // && result.score > -1000) {

                            label.innerHTML = fuzzysort.highlight(result, '<strong>', '</strong>');

                            node.classList.add('shown');

                            result = null;
                        } else {
                            if (label.dataset.synonyms) {

                                synonyms = label.dataset.synonyms.split(',');
                                foundInSynonimsFlag = false;

                                l = synonyms.length;

                                for (i = 0; i < l; i += 1) {
                                    result = fuzzysort.single(filter, synonyms[i], {threshold: -1000});
                                    if (result) { //&& result.score > -1000) {
                                        foundInSynonimsFlag = true;
                                        break;
                                    }
                                }

                                if (foundInSynonimsFlag) {
                                    node.classList.add('shown');
                                    node.classList.add('synonym');
                                    result = null;
                                    if (text !== html) {
                                        label.innerHTML = text; // reset
                                    }
                                } else {
                                    node.classList.remove('shown');
                                    node.classList.remove('synonym');
                                    if (text !== html) {
                                        label.innerHTML = text; // reset
                                    }
                                }


                            } else {
                                node.classList.remove('shown');
                                node.classList.remove('synonym');
                                if (text !== html) {
                                    label.innerHTML = text; // reset
                                }
                            }
                        }
                    } else {


                        node.classList.add('shown');
                        node.classList.remove('synonym');
                        if (text !== html) {
                            label.innerHTML = text; // reset
                        }
                    }

                    if (toFilter) {
                        if (node.classList.contains('shown')) {
                            // $node.parentsUntil($termsWrap, '.term').show();

                            var parentsUntil = getParentsUntil(node, '.terms');

                            l = parentsUntil.length;
                            for (i = 0; i < l; i += 1) {
                                parentsUntil[i].classList.add('shown');
                            }


                        }
                    }


                });

            }, 500);



/*
            $el.find('.term').each(function(i, node) { // OPTIMISE: refactor to vanilla JS for performance
                // nodes
                var $node = $(node);
                var $label = $(node.firstChild);

                var text = $label.text();
                var html = $label.html();

                // console.log($label.text());

                // input
                var filter = $input.val().replace(/\s/g, "");

                if (filter && filter !== "") {

                    var result = fuzzysort.single(filter, $label.text());

                    if (result && result.score > -1000) {
                        $label.html(fuzzysort.highlight(result, '<strong>', '</strong>'));

                        $node.addClass("shown");
                    }
                    else {
                        $node.removeClass("shown");
                        if (text !== html) {
                            $label.html(text); // reset
                        }
                    }
                } else {
                    $node.removeClass("shown");
                    if (text !== html) {
                        $label.html(text); // reset
                    }
                }

                $node.hide();
                if ($node.hasClass('shown')) {
                    $node.parentsUntil($termsWrap, '.term').show();
                }
            });
*/

        });


        var root_id = Object.keys($.fn.edamData)[0];
        var root_data = $.fn.edamData[root_id];

        var $terms = renderTerm(root_id, root_data, 0);


        var $triangle = $('<i class="glyphicon glyphicon-triangle-right"></i>');

        function renderTerm(id, data, level) {
            var $ul = $("<ul />");
            var children = data.children;

            if (children) {

                var i, len = children.length;
                for (i = 0; i < len; i += 1) {

                    var $li = $("<li class='term' />");

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

                    /* OPTIMISE: move to events for the sake of reducing DOM changing
                    if (filter && filter !== "") {
                        var result = fuzzysort.single(filter, label);

                        if (result) {
                            label = fuzzysort.highlight(result, '<strong>', '</strong>');

                            $li.addClass("highlighted");

                        }
                    }
                    */


                    var $label = $("<label />");
                    $label.text(label);

                    if (value.synonyms && value.synonyms.length > 0) {

                        // console.log(123);
                        $label[0].dataset.synonyms = value.synonyms;
                    }
                    if (value.description && value.description !== "") {

                        // console.log(123);
                        $label[0].dataset.description = value.description;
                    }
                    // description


                    $li.html($label);

                    if (settings.level) {
                        if (level < settings.level) {
                            $li.append(
                                renderTerm(key, value, level + 1)
                            );
                        }
                    } else {
                        $li.append(
                            renderTerm(key, value, level + 1)
                        );
                    }

                    // console.log(level);
                    if (settings.disclosed) {
                        if (level < settings.disclosed) {
                            $li.addClass('shown');
                        } else {
                            $li.removeClass('shown');
                        }
                    } else {
                        $li.addClass('shown');
                    }

                    $ul.append($li);
                }
            }

            return $ul;
        }


        return $termsWrap.append($terms);

    };

}( jQuery ));

/*

term -> "term_url" : {

}

 */