

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

    $.fn.operationsColors = {
      "Quantification": "#023fa5",
      "Service management": "#7d87b9",
      "Correlation": "#bec1d4",
      "Calculation": "#d6bcc0",
      "Conversion": "#bb7784",
      "Clustering": "#8e063b",
      "Generation": "#4a6fe3",
      "Classification": "#8595e1",
      "Analysis": "#b5bbe3",
      "Design": "#e6afb9",
      "Mapping": "#e07b91",
      "Validation": "#d33f6a",
      "Modelling and simulation": "#11c638",
      "Optimisation and refinement": "#8dd593",
      "Comparison": "#c6dec7",
      "Prediction and recognition": "#ead3c6",
      "Data handling": "#f0b98d",
      "Visualisation": "#ef9708",
      "Indexing": "#0fcfc0",
      "Annotation": "#9cded6"
    };

    $.fn.edam = function( options ) {

        var selected = null;

        var $el = this;
        var $input = $el.find("input");
        var $termsWrap = $el.find("ul.terms");
        var $spinner = $el.find(".spinner");

        var $infoBox = $el.find(".info");

        var $clear = $el.find(".clear");



        // get params, here are the defaults
        var settings = $.extend({
            types: null,
            level: null,
            disclosed: null,
            selected: null
        }, options );

        var label, text, html, filter, result, synonyms, foundInSynonimsFlag, toFilter, debounce;
        var i, l, t;

        $clear.click(function(){
            if (selected) {
                selected = null;

                $el.trigger('edams:unselect');

                $input.attr('disabled', false);
                $input.val('');
                $input.trigger('keyup');

                $clear.hide();

                if (settings.selected) {
                    settings.selected = null;

                    var root_id = Object.keys($.fn.edamData)[0];
                    var root_data = $.fn.edamData[root_id];

                    var $terms = renderTerm(root_id, root_data, 0);

                    $termsWrap.append($terms);
                }

                $termsWrap.show();
            } else {
                $input.val('');
                $input.trigger('keyup');
            }
        });


        function select(value, animation) {
            var animation = animation || 250;

            selected = value;

            $el.trigger('edams:select', value);

            $el.data(value);

            $input.val(value.label);
            $input.attr('disabled', true);

            $termsWrap.hide(animation);

            $clear.show();
            $clear.css({'display': 'inline-block'});
        }

        $input.on('keyup', function(e) {
            $clear.hide();
            clearTimeout(t);
            $spinner.show();

            filter = $input.val().split(' ').join('');
            toFilter = filter && filter !== "";

            if (toFilter) {
                debounce = 500;
            } else {
                debounce = 0;
            }

            t = setTimeout(function() {
                $spinner.hide();
                $clear.show();

                $el.find('.term').each(function(i, node) {
                    label = node.firstChild;

                    text = label.innerText;
                    html = label.innerHTML;


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
                        node.classList.remove('shown');
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

                if (!toFilter) {
                    $clear.hide();
                    $el.find("li.term").each(function(i, li){
                        var $li = $(li);
                        if ($li.hasClass('disclosed')) {
                            $li.addClass('shown');
                            $li.children('ul').children('li.term').addClass('shown');
                        } else {
                            $li.children('ul').children('li.term').removeClass('shown');
                        }
                    });
                }

                if ($el.find('ul.terms').height() === 0) {
                    $infoBox.html('<p class="text-info">Nothing was found</p>');
                    $infoBox.show();
                } else {
                    $infoBox.text('');
                    $infoBox.hide();
                }

            }, debounce);

        });


        function renderTerm(id, data, level, color) {
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

                    value.color = null;
                    if (level === 1) {
                        if ($.fn.operationsColors.hasOwnProperty(label)) {
                            value.color = $.fn.operationsColors[label];
                        }
                    }

                    if (color) {
                        value.color = color;
                    }

                    var $label = $("<label />");
                    $label.text(label);
                    $li.html($label);

                    var $infoIcon = $("<i class='form-info glyphicon glyphicon-info-sign'></i>");
                    var $infoBox = $("<div class='info text-info'></div>");

                    var info = false;


                    if (value.description && value.description !== "") {
                        info = true;
                        $infoBox.append("<p class='description'>" + value.description.replace(/\|/g, '<br>') + "</p>");
                    }

                    if (value.synonyms && value.synonyms.length > 0) {
                        info = true;

                        $label[0].dataset.synonyms = value.synonyms;


                        $infoBox.append("<p class='synonyms'><em>Synonyms:</em> " + value.synonyms.join(', ') + "</p>");
                    }

                    if (info) {
                        $li.append($infoIcon);
                        $li.append($infoBox);

                        $infoIcon.click(function(){
                            $(this).parent().find('.info').first().toggle(100);
                        });
                    }

                    if (settings.level) {
                        if (level < settings.level) {
                            $li.append(
                                renderTerm(key, value, level + 1, value.color)
                            );
                        }
                    } else {
                        $li.append(
                            renderTerm(key, value, level + 1, value.color)
                        );
                    }

                    if (settings.disclosed) {
                        if (level < settings.disclosed) {
                            $li.addClass('disclosed');
                        } else {
                            $li.removeClass('disclosed');
                        }
                    } else {
                        $li.addClass('disclosed');
                    }

                    if (value.children && value.children.length > 0) {

                        var $disclosure = $("<i class='disclosure glyphicon glyphicon-triangle-right'></i>");
                        $li.append($disclosure);

                        $disclosure.click(function () {
                            $(this).toggleClass('glyphicon-triangle-right');
                            $(this).toggleClass('glyphicon-triangle-bottom');
                            $(this).parent().toggleClass('disclosed');

                            if ($(this).parent().hasClass('disclosed')) {
                                $(this).parent().children('ul').children('li.term').addClass('shown');
                            }
                            else {
                                $(this).parent().children('ul').children('li.term').removeClass('shown');
                            }
                        });
                    }

                    if ($li.hasClass('disclosed')) {
                        $li.children('.disclosure').toggleClass('glyphicon-triangle-right');
                        $li.children('.disclosure').toggleClass('glyphicon-triangle-bottom');

                        $li.addClass('shown');
                        $li.children('ul').children('li.term').addClass('shown');
                    } else {
                        $li.children('ul').children('li.term').removeClass('shown');
                    }

                    $label.click(function(value) {
                        return function(e) {
                            e.stopPropagation();
                            select(value);
                            return false;
                        }
                    }(value));

                    // $li.addClass('shown');

                    $ul.append($li);
                }
            }

            return $ul;
        }

        if (settings.selected) {
            select(settings.selected, 0);
        } else {
            var root_id = Object.keys($.fn.edamData)[0];
            var root_data = $.fn.edamData[root_id];

            var $terms = renderTerm(root_id, root_data, 0);

            $termsWrap.append($terms);
        }



        return $termsWrap;

    };

}( jQuery ));

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

/*

term -> "term_url" : {

}

 */