"use strict";
  
var apikey;

function checkApikey() {
  apikey = localStorage.getItem("apikey");
  if (apikey) {
     $("#apikey").text(apikey);
     $("#apikey_request").hide();
     $("#akr").show();
     $("#url").val(localStorage.getItem('url'));
     retrieveData();
  }
  else {
     $("#apikey").text(""); 
     $("#ak").val("");
     $("#apikey_request").show();
     $("#akr").hide();
  }
}

function retrieveData() {
  retrieveAccounts();
  retrieveTransactions();
}

function showAccounts() {
  var list = $("#accounts-list");
  var debit_select = $("#debit-account").empty();
  var credit_select = $("#credit-account").empty();
  $("#accounts").html('').append(list);
  var items = JSON.parse(localStorage.getItem('accounts'));
  for (var i=0; i<items.length; i++) {
    var li = $('<li/>').addClass('account').append(
      $("<a/>")
        .html(items[i]['name'])
        .attr('data-code', items[i]['code'])
        .attr('data-name', items[i]['name'])
        .attr('data-longname', items[i]['longname'])
        .click(function() {
          $("#accounts-page").hide();
          $("#account-name").html($(this).attr('data-name'));
          $("#account-code").html($(this).attr('data-code'));
          $("#account-longname").html($(this).attr('data-longname'));
          $("#account-details-page").show();
        })
      );
    list.append(li);
    
    var select_option_debit = $('<option>').html(items[i]['name']).attr('value', items[i]['code']);
    var select_option_credit = $('<option>').html(items[i]['name']).attr('value', items[i]['code']);
    debit_select.append(select_option_debit);
    credit_select.append(select_option_credit);
  }
  list.listview('refresh');
  debit_select.selectmenu( "refresh" );
  credit_select.selectmenu( "refresh" );
  
  $("#accounts-back-button").click(function() {
  console.log("clicked");
    $("#accounts-page").show();
    $("#account-details-page").hide();
  });
  
}

function showTransactions() {
  var list = $("#transactions-list");
  list.empty();
  var items = JSON.parse(localStorage.getItem('transactions'));
  for (var i=0; i<items.length; i++) {
    var li = $('<li/>').addClass('transaction').append(
      $("<a/>")
        .html(items[i]['date'] + ' ' + items[i]['description'])
        .attr('data-id', items[i]['rowid'])
        .click(function() {
          $("#transactions-page").hide();
          $("#transaction-details-page").show();
        })
      );
    list.append(li);
  }
  list.listview('refresh');
  
  $("#transaction-back-button").click(function() {
    $("#transactions-page").show();
    $("#transaction-details-page").hide();
  });
  
}



function retrieveAccounts() {
  $.getJSON( localStorage.getItem('url'), {
    action: "accounts",
    apikey: apikey,
  })
  .done(function( data ) {
    localStorage.setItem('accounts', JSON.stringify(data));
    $("#accounts-hr").removeClass("failed");
    showAccounts();
  })
  .fail(function() {
    $("#accounts-hr").addClass("failed");
  })
  ;
}

function retrieveTransactions() {
  $.getJSON( localStorage.getItem('url'), {
    action: "transactions",
    apikey: apikey,
  })
  .done(function( data ) {
    localStorage.setItem('transactions', JSON.stringify(data));
    $("#transactions-hr").removeClass("failed");
    showTransactions();
  })
  .fail(function() {
    console.log('failed');
    $("#transactions-hr").addClass("failed");
  })
  ;
}

function saveTransaction() {
  $.ajax({
    url : localStorage.getItem('url') + '?' + $.param({
      action: "transaction",
      apikey: apikey,
      }),
    data: {
      data: { 
        date: $('#date').val(),
        debit: $('#debit-account').val(),
        credit: $('#credit-account').val(),
        amount: $('#amount').val(),
        description:$('#description').val()
        }},
    type : 'POST',
    success : function(data){
      console.log(data);
      /*
      retrieveTransactions();
      $("#transactions-page").show();
      $("#transaction-details-page").hide();
      */
      }
    })
    .fail(function() {
      console.log("error");
      return false;
    })
    ;
  }

$( document ).ready(function() {
  if (typeof(Storage)!=="undefined") {
     // the browser supports local and session storage...
     $("#loader").hide();
     
     $("#akr").click(function() {
         localStorage.removeItem("apikey");
         $("#apikey_request").hide();
         checkApikey();
     });
     
     $("#akb").click( function() {
         apikey = $("#ak").val();
         localStorage.setItem("apikey", apikey);
         $("#apikey").text(apikey);
         $("#apikey_request").hide();
         checkApikey();
     } );
     
     
     $(".menu-item").click(function() {
        var element = $(this).attr('data-element');
        $("#pages").children().hide();
        $(element).show();
        $("#menu-page").show();
     });
     
     $("#settings-save").click(function() {
        localStorage.setItem('url', $("#url").val());
     });
     
     $("#accounts-refresh-button").click(function() {
       retrieveAccounts();
      });
     $("#transactions-refresh-button").click(function() {
       retrieveTransactions();
      });
      
     $("#transaction-save").click(function() {
       saveTransaction();
      });
     
     checkApikey();
     
     
  }
  else {
     $("#loader").text("Sorry, this browser is not supported.");
  }
  
  
  
});
