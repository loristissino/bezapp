"use strict";

var apikey;
var accounts = [];
var transactions = [];
var currentTransaction;

function textToFloat(text) {
  var v=parseFloat(text);
  if (!v) v=0;
  return v;
}

function round(value, decimals) {
  // see http://www.jacklmoore.com/notes/rounding-in-javascript/
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function hashTags(string) {
  string = string.replace(/(^|\s)(#[a-z\d-_]+)/ig, "$1<span class='hash_tag'>$2</span>");
  console.log(string);
  return string;
}

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
  accounts = JSON.parse(localStorage.getItem('accounts'));
  for (var i=0; i<accounts.length; i++) {
    var li = $('<li/>').addClass('account').append(
      $("<a/>")
        .html(accounts[i]['name'])
        .attr('data-code', accounts[i]['code'])
        .attr('data-name', accounts[i]['name'])
        .attr('data-longname', accounts[i]['longname'])
        .click(function() {
          $("#accounts-page").hide();
          $("#account-name").html($(this).attr('data-name'));
          $("#account-code").html($(this).attr('data-code'));
          $("#account-longname").html($(this).attr('data-longname'));
          loadPostingsOfAccount($(this).attr('data-code'));
          $("#account-details-page").show();
        })
      );
    list.append(li);
  }
  list.listview('refresh');

  
  $("#accounts-back-button").click(function() {
    //console.log("clicked");
    $("#accounts-page").show();
    $("#account-details-page").hide();
  });
  
}

function loadPostingsOfAccount(code) {
  var lines = [];
  
  var t = transactions.filter(function(v) { return v['ok'] && !v['deleted']; });

  console.log(t);
  
  var sum = 0;

  for (var r=0; r<t.length; r++) {
    for (var p=0; p<t[r]['postings'].length; p++) {
      if (t[r]['postings'][p]['account']==code) {
        lines.push({date: t[r]['date'], description: t[r]['description'], amount: parseFloat(t[r]['postings'][p]['amount']).toFixed(2)});
        sum += parseFloat(t[r]['postings'][p]['amount']);
      }
    }
  }
  $('#account-netsum').html(sum.toFixed(2));
    
  if (lines.length>0) {
    var tableBody = $('#account-postings-body').empty();
    
    for (var i=0; i<lines.length; i++) {
      tableBody.append(
        $('<tr/>')
          .append(
            $('<td/>').html(lines[i]['date'])
          )
          .append(
            $('<td/>').html(lines[i]['description'])
          )
          .append(
            $('<td/>').addClass('amount').html(lines[i]['amount'])
          )
      );
    }
    $('#account-postings').show();
  }
  else {
    $('#account-postings').hide();
  }
}


function loadAccountsIntoPosting(element) {
  element.empty();
  var items = JSON.parse(localStorage.getItem('accounts'));
  element.append($('<option>').html('---').attr('value', ''));
  for (var i=0; i<items.length; i++) {
    var select_option = $('<option>').html(items[i]['name']).attr('value', items[i]['code']);
    element.append(select_option);
  }
}

function loadTransactionIntoUI(id) {
  if (id) {
    var transaction = transactions.find(function(item) {return item['rowid']==id;});
    $('#transaction-title').html('Edit').attr('data-id', id);
  }
  else {
    var d = new Date();
    var date = [ d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2) ].join('-');
    var transaction = {'date': date, 'description': '', 'postings': [ {'account': '', 'amount': ''}, {'account': '', 'amount': ''} ]};
    $('#transaction-title').html('New').attr('data-id', null);
  }
  $('#date').val(transaction['date']);
  $('#description').val(transaction['description']);
  currentTransaction = transaction;
  postingsToUI();
}

function postingsToUI() {
  var postings = $("#postings").empty();
    
  for (var i=0; i<currentTransaction['postings'].length; i++) {
    var account = $('<select/>').attr('id', 'account_' + i).attr('name', 'account_' + i);
    loadAccountsIntoPosting(account);
    account.val(currentTransaction['postings'][i]['account']);
    postings.append(account);
    $('#account_' + i).selectmenu().selectmenu( "refresh" );
    //postings.append($('<br />'));
    var amount = $('<input/>').attr('id', 'amount_' + i).attr('type', 'number').css('text-align', 'right').attr('pattern', '\-[0-9\.]').val(currentTransaction['postings'][i]['amount']);
    postings.append(amount);
    //postings.append($('<br />'));
    $('#amount_' + i).textinput().textinput( "refresh" );
  }
}

function postingsFromUI() {
  for (var i=0; i<currentTransaction['postings'].length; i++) {
    currentTransaction['postings'][i]['account']=$('#account_' + i).val();
    currentTransaction['postings'][i]['amount']=$('#amount_' + i).val();
  }
}

function isTransactionOk(transaction) {
  var sum = transaction['postings'].reduce(function(a, v) {
    var account = accounts.find(function(item) {return item['code']==v['account'];});
    var amount = 0;
    if (account) {
      amount = textToFloat(v['amount']);
    }
    else {
      console.log("account not found: " + v['account']);
      console.log(accounts);
    }
    return a + amount; 
  }, 0);
  return sum == 0 && transaction['postings'].length>=2;
}

function fixTransaction(transaction) {
  // first, we filter out postings with no account
  transaction['postings'] = transaction['postings'].filter(function(v) {return v['account']!='';});
  
  // second, we round the amounts to two decimals and find out how many postings have a zero amount
  var pWV = [];  // postings with amount zero;
  transaction['postings'].filter(function(v, k) {
    if (v['amount']==0) pWV.push(k);
  });
  
  // third, if we only have one zero-amount posting...
  if (pWV.length==1){ 
    var sum = transaction['postings'].reduce(function(a, v) {return a + textToFloat(v['amount']); }, 0);
    if (sum!=0) {
      transaction['postings'][pWV[0]]['amount']=-sum;
    } else {
      // (but if we don't really need it, we remove the posting...
      transaction['postings'] = transaction['postings'].filter(function(v) {return v['amount']!=0;});
    }
  }
  
  // fourth, we sort postings by account code
  
  transaction['postings'].sort(function(a,b) {return a['account']>b['account'];});
    
}

function loadTransactionsIntoUI() {

  var list = $("#transactions-list");
  list.empty();
  var items = transactions
    .filter(function (item) { return item['deleted']==false; })
    .sort(function (a, b) { return a['date'] < b['date']; });
  for (var i=0; i<items.length; i++) {
    var text = items[i]['date'] + ' ' + hashTags(items[i]['description']);
    if (!items[i]['ok']) {
      text += ' ⚠️';
    }
    var li = $('<li/>').addClass('transaction').append(
      $("<a/>")
        .html(text)
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
  
  $('.hash_tag').click(function(e) {
    e.stopPropagation();
    alert($(this).context.textContent);
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
  postingsFromUI();
  var data = {
    date: $('#date').val(),
    description:$('#description').val(),
    onDB: false,
    deleted: false,
  }
  fixTransaction(currentTransaction);
  data['postings']=currentTransaction['postings'];
  data['ok']=isTransactionOk(currentTransaction);
  var index = transactions.findIndex(function(item) {return item['rowid']==id;});
  if (index > -1) {
    data['rowid']=id;
    transactions[index]=data;
  }
  else {
    data['rowid']=-Date.now().valueOf(); // we use negative numbers for new items' ids
    transactions.push(data);
  }
  
  saveTransactionsToLocalStorageAndShowThem();
}



function saveTransactionsToLocalStorageAndShowThem() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
  loadTransactionsIntoUI();
  $("#transactions-page").show();
  $("#transaction-details-page").hide();
}


function uploadTransaction() {
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
      /*
      console.log(data);
      retrieveTransactions();
      */  
      // here we should mark the transaction as sync'ed.
      }
    })
   .fail(function() {
      console.log("error");
      return false;
    })
  ;
}

function removeTransaction() {
  var id = $('#transaction-title').attr('data-id');
  var index = transactions.findIndex(function(item) {return item['rowid']==id;});
  if (index > -1) {
    transactions[index]['deleted']=true;
  }
  console.log(transactions);
  saveTransactionsToLocalStorageAndShowThem();
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
    loadTransactionIntoUI(null)
    $("#transactions-page").hide();
    $("#transaction-details-page").show();

  });


  $("#transaction-delete").click(function() {
    $("#pages").children().hide();
    $("#dialog-page").show();
  });

  $("#transaction-add-account").click(function() {
    postingsFromUI();
    currentTransaction['postings'].push({'account': '', 'amount': ''});
    postingsToUI();
  });

  $("#delete-transaction-confirm").click(function() {
    removeTransaction();
    $("#dialog-page").hide();
    $("#transactions-page").show();
  });

  $("#delete-transaction-cancel").click(function() {
    $("#dialog-page").hide();
    $("#transaction-details-page").show();
  });


  checkApikey();
  
  transactions = JSON.parse(localStorage.getItem('transactions'));
  if (transactions) {
    loadTransactionsIntoUI();
  }
  else {
    transactions = [];
  }
  
  accounts = JSON.parse(localStorage.getItem('accounts'));
  if (accounts) {
    loadAccountsIntoUI();
  }
  
  var content = JSON.stringify({'a': 500, 'b': "ciao bao miao"});
  var password = "booo";
  
  var encrypted = GibberishAES.enc(content, password);
  console.log(encrypted);

  var decrypted =  GibberishAES.dec(encrypted, password);
  console.log(decrypted);

  console.log(transactions);
  //alert(decrypted);
  
  
});


