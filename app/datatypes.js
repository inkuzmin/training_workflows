window.Workflows.DataType = {
    Text: {
        init: function () {
            return {
                inputs: [""]
            };
        }
    },
    MultipleChoice: {
        init: function () {
            return {
                choices: [
                    {
                        question: "",
                        answers: [
                            {
                                answer: "",
                                correct: false,
                                explanation: ""
                            }
                        ]
                    }
                ]
            }
        }
    },

    // EDAM

    OperationOntologyTerm: {
        init: function () {
            return {
                terms: []
            }
        }
    },
    InputTypeOntologyTerm: {
        init: function () {
            return {
                terms: []
            }
        }
    },
    OutputTypeOntologyTerm: {
        init: function () {
            return {
                terms: []
            }
        }
    },
    FormatTypeOntologyTerm: {
        init: function () {
            return {
                terms: []
            }
        }
    },
    RequiredConditions: {
        init: function () {
            return {
                terms: []
            }
        }
    }
};

Workflows.DataTypeView = {
    OperationOntologyTerm: {
        render: function (data) {
            var tmpl = HandlebarsTemplates['workflows/EdamInput'];
            var $edam = $(tmpl(data));

            $edam.edam({
                types: ["Operation"],
                disclosed: 1,
                selected: data.data.terms.length > 0 && data.data.terms[0]
            });

            $edam.on('edams:select', function(e, value){
                data.data.terms.push(value);
                if (value.color) {
                    cy.$(':selected').data.color = value.color;
                    cy.$(':selected').style({'background-color': value.color, 'background-opacity': 0.8});

                    cy.$(':selected').descendants().style({'background-color': value.color, 'background-opacity': 0.8});
                }
            });

            $edam.on('edams:unselect', function(e, value){
                data.data.terms.pop(value);
                cy.$(':selected').data.color = 'undefined';
                cy.$(':selected').style({'background-color': "lightgrey", 'background-opacity': 0.8});
                cy.$(':selected').descendants().style({'background-color': "lightgrey", 'background-opacity': 0.8});
            });
            return $edam;
        },

        draw: function () {

        }

    },
    InputTypeOntologyTerm: {
        render: function (data) {
            var tmpl = HandlebarsTemplates['workflows/EdamInput'];
            var $edam = $(tmpl(data));

            $edam.edam({
                types: ["Data"],
                disclosed: 1,
                selected: {label: '123'}
            });

            return $edam;

        }
    },
    OutputTypeOntologyTerm: {
        render: function (data) {
            var tmpl = HandlebarsTemplates['workflows/EdamInput'];
            var $edam = $(tmpl(data));

            $edam.edam({
                types: ["Data"],
                disclosed: 1,
                selected: {label: '123'}
            });

            return $edam;

        }
    },
    FormatTypeOntologyTerm: {
        render: function (data) {
            var tmpl = HandlebarsTemplates['workflows/EdamInput'];
            var $edam = $(tmpl(data));

            $edam.edam({
                types: ["Format"],
                disclosed: 1,
                selected: {label: '123'}
            });

            return $edam;

        }
    },


    Text: {
        render: function (data) { // data = Workflows.DataType.Text
            var tmpl = HandlebarsTemplates['workflows/fields/' + data.datatype];

            var $fieldNode = $(tmpl(data));

            Workflows.DataTypeView.Text.addHandlers($fieldNode, data);
            Workflows.DataTypeView.Text.setButtonState($fieldNode);

            return $fieldNode;

        },

        show: function () {
            // this is how we will show the field in View mode
        },

        // Helpers

        save: function($fieldNode, data) {
            data.data.inputs = [];
            $fieldNode.find(".input input").each(function(i, el) {
                data.data.inputs.push($(el).val());
            });
        },

        setButtonState: function($fieldNode) {
            if ($fieldNode.find(".input").length > 1) {
                $fieldNode.find(".grip").show();
                $fieldNode.find(".remove").show();
            } else {
                $fieldNode.find(".grip").hide();
                $fieldNode.find(".remove").hide();
            }
        },

        addHandlers: function($fieldNode, data) {
            // Sort
            $fieldNode.find(".sort-inputs").sortable({
                handle: ".grip",
                placeholder: "ui-state-highlight",
                stop: function( event, ui ) {
                    Workflows.DataTypeView.Text.save($fieldNode, data);
                }
            });

            // Info
            $fieldNode.find(".form-info").click(function() {
                $(this).next().toggle(100);
            });

            // Input handlers
            $fieldNode.find(".input").each(function(i, el) {
                Workflows.DataTypeView.Text.addInputHandlers($fieldNode, $(el), data);
            });

            // Add
            $fieldNode.find(".add-input").click(function(){
                var $input = $(HandlebarsTemplates['workflows/fields/TextInput']());

                Workflows.DataTypeView.Text.addInputHandlers($fieldNode, $input, data);

                $fieldNode.find(".sort-inputs").append($input);
                $input.find("input").focus();

                Workflows.DataTypeView.Text.setButtonState($fieldNode);
            });
        },

        addInputHandlers: function ($fieldNode, $input, data) {
            // Remove
            $input.find(".remove").click(function(){
                $(this).parent().remove();

                Workflows.DataTypeView.Text.save($fieldNode, data);
                Workflows.DataTypeView.Text.setButtonState($fieldNode);
            });

            // Keyboard
            $input.find("input").keyup(function(){
                Workflows.DataTypeView.Text.save($fieldNode, data);
            });

            // TODO: on Return when last node editing adds now input?

        }


    },
    MultipleChoice: {
        render: function (data) { // data = Workflows.DataType.MultipleChoice
            var tmpl = HandlebarsTemplates['workflows/fields/' + data.datatype];

            var $fieldNode = $(tmpl(data));

            Workflows.DataTypeView.MultipleChoice.addHandlers($fieldNode, data);
            Workflows.DataTypeView.MultipleChoice.setButtonState($fieldNode);

            return $fieldNode;

        },

        save: function($fieldNode, data) {
            data.data.choices[0] =
                {
                    question: $fieldNode.find('.question').val(),
                    answers: [
                        // {
                        //     answer: "",
                        //     correct: false,
                        //     explanation: ""
                        // }
                    ]
                };

            $fieldNode.find(".answer").each(function(i, el) {
                data.data.choices[0].answers.push({
                    answer: $(el).find("input[type=text]").val(),
                    correct: $(el).find(".correct").is(':checked'),
                    explanation: ""
                });

            });
        },

        addHandlers: function ($fieldNode, data) {
            // Sort
            $fieldNode.find(".sort-answers").sortable({
                handle: ".grip",
                placeholder: "ui-state-highlight",
                stop: function( event, ui ) {
                    Workflows.DataTypeView.MultipleChoice.save($fieldNode, data);
                }
            });

            // Info
            $fieldNode.find(".form-info").click(function() {
                $(this).next().toggle(100);
            });

            // Add answer
            $fieldNode.find(".add-answer").click(function(){
                var $input = $(HandlebarsTemplates['workflows/fields/MultipleChoiceAnswer']());

                Workflows.DataTypeView.MultipleChoice.addInputHandlers($fieldNode, $input, data);

                $fieldNode.find(".sort-answers").append($input);
                $input.find("input").focus();

                Workflows.DataTypeView.MultipleChoice.setButtonState($fieldNode);
            });

            // Question handlers
            $fieldNode.find(".question").keyup(function(){
                Workflows.DataTypeView.MultipleChoice.save($fieldNode, data);
            });

            // Answer handlers
            $fieldNode.find(".answer").each(function(i, el) {
                Workflows.DataTypeView.MultipleChoice.addInputHandlers($fieldNode, $(el), data);
            });

        },

        addInputHandlers: function ($fieldNode, $input, data) {
            // Remove
            $input.find(".remove").click(function(){
                $(this).parent().parent().remove();

                Workflows.DataTypeView.MultipleChoice.save($fieldNode, data);
                Workflows.DataTypeView.MultipleChoice.setButtonState($fieldNode);
            });

            // Keyboard
            $input.find(".correct").click(function(){
                Workflows.DataTypeView.MultipleChoice.save($fieldNode, data);
            });

            // Keyboard
            $input.find("input[type=text]").keyup(function(){
                Workflows.DataTypeView.MultipleChoice.save($fieldNode, data);
            });

        },

        setButtonState: function ($fieldNode) {
            if ($fieldNode.find(".answer").length > 1) {
                $fieldNode.find(".grip").show();
                $fieldNode.find(".remove").show();
            } else {
                $fieldNode.find(".grip").hide();
                $fieldNode.find(".remove").hide();
            }
        },

        show: function () {
            // this is how we will show the field in View mode
        },

    },
    Boolean: { // data = Workflows.DataType.Boolean

    }

};