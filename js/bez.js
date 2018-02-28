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

function encrypt(content) {
  var password = localStorage.getItem('password') || '';
  if (password) {
    return GibberishAES.enc(content, password);
  }
  else {
    return content;
  }
}

function decrypt(content) {
  var password = localStorage.getItem('password') || '';
  if (password) {
    content = content.replace('\n', '').replace("\\", '');
    try {
      return GibberishAES.dec(content, password);
    }
    catch (e) {
    } return false;
  }
  else {
    return content;
  }
}

function round(value, decimals) {
  // see http://www.jacklmoore.com/notes/rounding-in-javascript/
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function hashTags(string) {
  string = string.replace(/(^|\s)(#[a-z\d-_]+)/ig, "$1<span class='hash_tag'>$2</span>");
  return string;
}

function checkApikey() {
  apikey = localStorage.getItem("apikey");
  if (apikey) {
     $("#apikey").text(apikey);
     $("#apikey_request").hide();
     $("#akr").show();
     $("#url").val(localStorage.getItem('url'));
     $("#database").val(localStorage.getItem('database') || 'test');
     $("#password").val(localStorage.getItem('password') || 'opensecret');
     $("#limit-date").val(localStorage.getItem('limit-date') || '2099-12-31');
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
        .html(accounts[i]['emoji'] + ' ' + accounts[i]['name'])
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
  
  var limitDate = localStorage.getItem('limit-date');
  console.log(limitDate);
  
  var t = transactions.filter(function(v) { return v['ok'] && !v['deleted'] && v['date']<=limitDate; });

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
    var select_option = $('<option>').html(items[i]['emoji'] + ' ' + items[i]['name']).attr('value', items[i]['code']);
    element.append(select_option);
  }
}

function loadTransactionIntoUI(id) {
  console.log("loading transaction..." + id);
  if (id) {
    var transaction = transactions.find(function(item) {return item['id']==id;});
    $('#transaction-title').html('Edit').attr('data-id', id);
  }
  else {
    var d = new Date();
    var date = [ d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2) ].join('-');
    var transaction = {'date': date, 'description': '', 'postings': [ {'account': '', 'amount': ''}, {'account': '', 'amount': ''} ]};
    $('#transaction-title').html('New').attr('data-id', null);
  }
  currentTransaction = transaction;
  postingsToUI();
  $('#date').val(transaction['date']);
  $('#description').val(transaction['description']);
  setTimeout(function(){
    // hack from https://stackoverflow.com/questions/7179098/focus-problem-with-jquery-mobile
    $('#description').focus();
  },0);
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
    var amount = $('<input/>')
      .attr('id', 'amount_' + i)
      .attr('type', 'number')
      .css('text-align', 'right')
      .attr('pattern', '\-[0-9\.]')
      .val(currentTransaction['postings'][i]['amount'])
      .on("swiperight", function() {
        $(this).val("").focus();
      });
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
  var positive=0;
  var sum = transaction['postings'].reduce(function(a, v) {
    var account = accounts.find(function(item) {return item['code']==v['account'];});
    var amount = 0;
    if (account) {
      amount = textToFloat(v['amount']);
      if (amount>0) {
        positive+=amount;
      }
    }
    else {
      console.log("account not found: " + v['account']);
      console.log(accounts);
    }
    return a + amount; 
  }, 0);
  transaction['amount']=positive;
  return sum == 0 && transaction['postings'].length>=2 && positive>0;
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

function markAllTransactionsAsNew() {
  // this function is called when there is a password change
  // we need to make copies of the values and mark them as new,
  // while marking the old ones as deleted
  var newTransactions = [];
  for (var i=0; i<transactions.length; i++) {
    if (transactions[i]['onDB']) {
      var newTransaction=JSON.parse(JSON.stringify(transactions[i]));
      transactions[i]['deleted']=true;
      newTransaction['onDB']=false;
      newTransaction['id']=-transactions[i]['id'];
      newTransactions.push(newTransaction);
    }
  }
  transactions = transactions.concat(newTransactions);
  saveTransactionsToLocalStorage(false);
}

function loadTransactionsIntoUI() {

  var list = $("#transactions-list");
  var limitDate = localStorage.getItem('limit-date');
  list.empty();
  var items = transactions
    .filter(function (item) { return item['deleted']==false && item['date']<=limitDate; })
    .sort(function (a, b) { return a['date'] < b['date']; });
  for (var i=0; i<items.length; i++) {
    var t = [items[i]['date'], ' ', hashTags(items[i]['description']), ' / ', items[i]['amount'].toFixed(2)];
    
    var icon = 'carat-r';
    if (items[i]['onDB']) {
      icon = 'cloud';
    }
    if (!items[i]['ok']) {
      icon = 'alert';
    }
    
    var li = $('<li/>').attr('data-icon', icon).addClass('transaction').append(
      $("<a/>")
        .html(t.join(''))
        .attr('data-id', items[i]['id'])
        .click(function() {
          $("#transactions-page").hide();
          console.log($(this).attr('data-id'));
          console.log(transactions);
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
    r: "accounts",
    db: localStorage.getItem('database'),
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

function synchronizeTransactions() {
  // first, we filter out transactions that were deleted but never transferred to the DB
  transactions = transactions.filter(function(v) { return !(v['deleted'] && !v['onDB']); });
  saveTransactionsToLocalStorage(false);
  
  // second, we act on the remaining transactions according to the content of each one
  /*
  for (var i=0; i<transactions.length; i++)
  {
    var t = transactions[i];
    if (t['deleted']) {
      deleteTransaction(t['id']);
    }
    if (!t['onDB'] && t['ok']) {
      uploadTransaction(t);
    }
  }*/
  var i=0;
  var loop = setInterval(function() {
    if (i<transactions.length) {
      console.log('t' + i);
      var t = transactions[i];
      if (t['deleted']) {
        deleteTransaction(t['id']);
      }
      if (!t['onDB'] && t['ok']) {
        uploadTransaction(t);
      }
    }
    else {
      clearInterval(loop);
    }
    i++;
  }, 30);
  
  
  // third, we retrieve stored transactions 
  retrieveTransactions();
}

function retrieveTransactions() {
  $.getJSON( localStorage.getItem('url'), {
    r: "transactions",
    apikey: apikey,
    db: localStorage.getItem('database')
  })
  .done(function( data ) {
    console.log(data);
    var t = data;
    for (var i=0; i<data.length; i++) {
      var index = transactions.findIndex(function(item) {return item['id']==t[i]['id'];});
      if (index==-1) {
        console.log('we have to push one...');
        console.log(t[i]['id']);
        var decrypted = decrypt(t[i]['payload']);
        if (decrypted) {
          var values = JSON.parse(decrypt(t[i]['payload']));
          delete values['nonce'];
          values['id']=t[i]['id'];
          values['ok']=true;
          values['onDB']=true;
          console.log(values);
          transactions.push(values);
        }
      }
    }
    saveTransactionsToLocalStorage(true);
  })
  .fail(function() {
    console.log('failed');
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
  data['amount']=currentTransaction['amount'];
  var index = transactions.findIndex(function(item) {return item['id'] && item['id']==id;});
  console.log('found! index=' + index);
  if (index > -1) {
    data['id']=id;
    transactions[index]=data;
  }
  else {
    data['id']=-Date.now().valueOf(); // we use negative numbers for new items' ids
    console.log(data['id']);
    console.log('assigned');
    transactions.push(data);
  }
  
  saveTransactionsToLocalStorage(true);
}

function saveTransactionsToLocalStorage(show) {
  localStorage.setItem('transactions', JSON.stringify(transactions));
  if (show) {
    loadTransactionsIntoUI();
    $("#transactions-page").show();
    $("#transaction-details-page").hide();
  }
}

function uploadTransaction(transaction) {
  var params = {
      r: "transaction",
      apikey: apikey,
      db: localStorage.getItem('database'),
    };

  var type = 'POST';
  
  if (transaction['id']>=0) {
    type = 'PUT';
    params['id'] = transaction['id'];
  }
  
  var oldId = transaction['id'];
  
  var savedTransaction = JSON.parse(JSON.stringify(transaction));
  
  delete savedTransaction['id'];
  delete savedTransaction['ok'];
  savedTransaction['nonce']=Math.random()+Date.now();

  console.log(JSON.stringify(savedTransaction));

  var payload = encrypt(JSON.stringify(savedTransaction));
  
  // console.log(payload);

  var htmlElement = $('#transactions-page').find("[data-id='" + oldId + "']");

  if (htmlElement){
    htmlElement.addClass('synchronizing');
  }
  
  $.ajax({
    url : localStorage.getItem('url') + '?' + $.param(params),
    //contentType: 'text/plain',
    data: JSON.stringify(
      { 
        data: {
          payload: payload
        }
      }
    ),
    type : type,
    success : function(data){
      var receivedData = JSON.parse(data);
      if (receivedData['status']=='OK') {
        var index = transactions.findIndex(function(item) {return item['id']==oldId;});
        transactions[index]['id']=parseInt(receivedData['id']);
        transactions[index]['onDB']=true;
        saveTransactionsToLocalStorage(false);
          if (htmlElement) {
            htmlElement
              .attr('data-icon', 'cloud')
              .addClass('ui-icon-cloud')
              .removeClass('ui-icon-carat-r')
              .removeClass('synchronizing')
              ;
        }
      }
      }
    })
   .fail(function(request, textStatus, errorThrown) {
      console.log("error");
      console.log(request);//.getAllResponseHaders()); //.getResponseHeader('some_header')
      console.log("headers");
      console.log(request.getAllResponseHeaders()); //.getResponseHeader('some_header')
      return false;
    })
  ;
}

function removeTransaction() {
  var id = $('#transaction-title').attr('data-id');
  var index = transactions.findIndex(function(item) {return item['id']==id;});
  if (index > -1) {
    transactions[index]['deleted']=true;
  }
  saveTransactionsToLocalStorage(true);
}

function deleteTransaction(id) {
  var params = {
      r: "transaction",
      apikey: apikey,
      db: localStorage.getItem('database'),
      id: id
    };

  var type = 'DELETE';
  
  $.ajax({
    url : localStorage.getItem('url') + '?' + $.param(params),
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    success : function(data){
      var receivedData = JSON.parse(data);
      if (receivedData['status']=='OK') {
        var index = transactions.findIndex(function(item) {return item['id']==id;});
        transactions.splice(index, 1);
        saveTransactionsToLocalStorage(false);
      }
      }
    })
   .fail(function() {
      console.log("error");
      return false;
    })
  ;
}

function exportToFile() {
  var htmlElement = $("#export-div");
  $("#import-export-sync-image").show();
  
  var params = {
    r: "file",
  };
  
  $.ajax({
    url : localStorage.getItem('url') + '?' + $.param(params),
    type : 'POST',
    data: JSON.stringify(
      { 
        content: encrypt(JSON.stringify({accounts:accounts, transactions:transactions}))
      }
    ),    
    success : function(data){
      console.log(data);
      var info = JSON.parse(data);
      console.log(info);
      if (info['status']=="OK") {
        htmlElement.html($('<a/>').attr('href', info['url']).html('download / share'));
      }
      else {
        htmlElement.html($('<p/>').html('Sorry, something went wrong...'));
      }
      $("#import-export-sync-image").hide();

    }
    })
   .fail(function(request, textStatus, errorThrown) {
      htmlElement.html($('<p/>').html('Sorry, something went wrong...'));
      $("#import-export-sync-image").hide();
      console.log("error");
      console.log(request);//.getAllResponseHaders()); //.getResponseHeader('some_header')
      console.log("headers");
      console.log(request.getAllResponseHeaders()); //.getResponseHeader('some_header')
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

  $("#import-export").click(function() {
    $("#export-div").empty();
    $("#import-export-page").show();
    $('#settings-page').hide();
  });
  
  $("#import-export-back-button").click(function() {
    $("#import-export-page").hide();
    $('#settings-page').show();
  });

  $("#export-button").click(function() {
    console.log("exporting...");
    exportToFile();
  });

  // ---- settings management ----
  $("#settings-save").click(function() {
    localStorage.setItem('url', $("#url").val());
    localStorage.setItem('database', $("#database").val());
    if ($("#password").val()!= localStorage.getItem('password')) {
      localStorage.setItem('password', $("#password").val());
      markAllTransactionsAsNew();
    }
    localStorage.setItem('password', $("#password").val());
    localStorage.setItem('limit-date', $("#limit-date").val());
    loadTransactionsIntoUI();
  });

  // ---- refresh buttons ----
  $("#accounts-refresh-button").click(function() {
   retrieveAccounts();
  });

  $("#transactions-sync-button").click(function() {
   synchronizeTransactions();
  });

  // ---- action buttons ----
  $("#transaction-save").click(function() {
    saveTransaction();
  });
  $("#transaction-duplicate").click(function() {
    var newTransaction = JSON.parse(JSON.stringify(currentTransaction));
    // we make a deep copy of the transaction...
    newTransaction['id']=-Date.now().valueOf();
    newTransaction['onDB']=false;
    // and we change the id
    transactions.push(newTransaction);
    saveTransactionsToLocalStorage(true);
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

  $('#description').on("swiperight", function() {
    $(this).val("").focus();
  });

  $("#delete-transaction-confirm").click(function() {
    removeTransaction();
    $("#dialog-page").hide();
    $("#transactions-page").show();
    $("#menu-page").show();
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
  
});

