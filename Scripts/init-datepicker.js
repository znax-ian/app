$(function(){
    var $start = $('#startDate');
    var $end = $('#endDate');

    $start.datepicker({
        dateFormat: 'yy-mm-dd',
        onSelect: function(dateText){
            $end.datepicker('option', 'minDate', dateText);
        }
    });

    $end.datepicker({
        dateFormat: 'yy-mm-dd',
        onSelect: function(dateText){
            $start.datepicker('option', 'maxDate', dateText);
        }
    });
});