Workflows.DataType = {
    Text: {

    },
    MultipleChoice: {

    },
    Boolean: {

    }
};

Workflows.DataTypeView = {
    renderText: function (data) { // data = Workflows.DataType.Text
        var tmpl = HandlebarsTemplates['workflows/fields/MultipleChoice'];

        var $fieldNode = $(tmpl(data));

    },
    renderMultipleChoice: function (data) { // data = Workflows.DataType.MultipleChoice

        var tmpl = HandlebarsTemplates['workflows/fields/MultipleChoice'];

        var $fieldNode = $(tmpl(data));




    },
    renderBoolean: function (data) { // data = Workflows.DataType.Boolean

    }

};