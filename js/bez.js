"use strict";

var apikey;
var accounts;
var transactions;

function checkApikey() {
  apikey = localStorage.getItem("apikey");
  if (apikey) {
     $("#apikey").text(apikey);
     $("#apikey_request").hide();
     $("#akr").show();
     $("#url").val(localStorage.getItem('url'));
  }
  else {
     $("#apikey").text(""); 
     $("#ak").val("");
     $("#apikey_request").show();
     $("#akr").hide();
  }
}


function loadAccountsIntoUI() {
  var list = $("#accounts-list").empty();
  var debit_select = $("#debit-account").empty();
  var credit_select = $("#credit-account").empty();
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

function loadTransactionIntoUI(id) {
  var transaction = transactions.find(function(item) {return item['rowid']==id;});
  $('#transaction-title').html('Edit').attr('data-id', id);
  $('#date').val(transaction['date']);
  $('#debit-account').val(transaction['debit-account']).selectmenu( "refresh" );
  $('#credit-account').val(transaction['credit-account']).selectmenu( "refresh" );
  $('#amount').val(transaction['amount']);
  $('#description').val(transaction['description']);
  $('#debit-account').val(transaction['debit']).selectmenu( "refresh" );
  $('#credit-account').val(transaction['credit']).selectmenu( "refresh" );
}

function loadTransactionsIntoUI() {
  var list = $("#transactions-list");
  list.empty();
  transactions = JSON.parse(localStorage.getItem('transactions'));
  var items = transactions;
  for (var i=0; i<items.length; i++) {
    var li = $('<li/>').addClass('transaction').append(
      $("<a/>")
        .html(items[i]['date'] + ' ' + items[i]['description'])
        .attr('data-id', items[i]['rowid'])
        .click(function() {
          $("#transactions-page").hide();
          loadTransactionIntoUI($(this).attr('data-id'));
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
    $("#accounts-hr").removeClass("fail");
    $("#accounts-hr").addClass("success");
    loadAccountsIntoUI();
  })
  .fail(function() {
    $("#accounts-hr").removeClass("success");
    $("#accounts-hr").addClass("fail");
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
    $("#transactions-hr").addClass("success");
    $("#transactions-hr").removeClass("fail");
    loadTransactionsIntoUI();
  })
  .fail(function() {
    console.log('failed');
    $("#transactions-hr").addClass("fail");
    $("#transactions-hr").removeClass("success");
  })
  ;
}

function saveTransaction() {
  var id = $('#transaction-title').attr('data-id');
  
  var params = {
      action: "transaction",
      apikey: apikey,
    };

  var type = 'POST';
  
  if (id) {
    type = 'PUT';
    params['id'] = id;
  }
  
  $.ajax({
    url : localStorage.getItem('url') + '?' + $.param(params),
    contentType: 'application/json',
    data: JSON.stringify({
      data: { 
        date: $('#date').val(),
        debit: $('#debit-account').val(),
        credit: $('#credit-account').val(),
        amount: $('#amount').val(),
        description:$('#description').val()
        }}),
    type : type,
    success : function(data){
      console.log(data);
      retrieveTransactions();
      $("#transactions-page").show();
      $("#transaction-details-page").hide();
      }
    })
   .fail(function() {
      console.log("error");
      return false;
    })
  ;
}

function deleteTransaction() {
  var id = $('#transaction-title').attr('data-id');
  
  var params = {
      action: "transaction",
      apikey: apikey,
    };

  var type = 'DELETE';
  
  if (id) {
    params['id'] = id;
  }
  
  $.ajax({
    url : localStorage.getItem('url') + '?' + $.param(params),
    type : type,
    success : function(data){
      console.log(data);
      retrieveTransactions();
      $("#transactions-page").show();
      $("#transaction-details-page").hide();
      }
    })
   .fail(function() {
      console.log("error");
      return false;
    })
  ;
}

$( document ).ready(function() {
  if (typeof(Storage)=="undefined") {
    $("#errors-page").text("Sorry, this browser is not supported.").show();
    return;
  }
  // the browser supports local and session storage...
  $("#errors").hide();

  // ---- API key management ----
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

  // ---- menu management ----
  $(".menu-item").click(function() {
    var element = $(this).attr('id').replace(/-menu-item/, '');
    $("#pages").children().hide();
    $("#menu-page").children().show();
    $('#'+element+'-menu-item').hide();
    $('#'+element+'-page').show();
    $("#menu-page").show();
  });

  // ---- settings management ----
  $("#settings-save").click(function() {
    localStorage.setItem('url', $("#url").val());
  });

  // ---- refresh buttons ----
  $("#accounts-refresh-button").click(function() {
   retrieveAccounts();
  });

  $("#transactions-refresh-button").click(function() {
   retrieveTransactions();
  });

  // ---- action buttons ----
  $("#transaction-save").click(function() {
    saveTransaction();
  });
  $("#transaction-duplicate").click(function() {
    $('#transaction-title').html('New').attr('data-id', null);
  });
  $("#transactions-new").click(function() {
    var d = new Date();
    $('#date').val([ d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2) ].join('-'));
    $('#debit-account').val('').selectmenu( "refresh" );
    $('#credit-account').val('').selectmenu( "refresh" );
    $('#amount').val(0);
    $('#description').val('');
    $('#transaction-title').html('New').attr('data-id', null);
    $("#transactions-page").hide();
    $("#transaction-details-page").show();

  });


  $("#transaction-delete").click(function() {
    $("#pages").children().hide();
    $("#dialog-page").show();
  });

  $("#delete-transaction-confirm").click(function() {
    deleteTransaction();
    $("#dialog-page").hide();
    $("#transactions-page").show();
  });

  $("#delete-transaction-cancel").click(function() {
    $("#dialog-page").hide();
    $("#transaction-details-page").show();
  });



  checkApikey();
  
  loadAccountsIntoUI();
  loadTransactionsIntoUI();
  
});
