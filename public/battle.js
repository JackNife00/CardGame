window.onload = function()
{
	var heal = document.getElementById("heal")
	var hit = document.getElementById("hit")
	var divide = document.getElementById("divide")
	var d6 = document.getElementById("d6")
	var close = document.getElementById("close")
	var selectDeck = document.getElementById("selectDeck")
	var decks = document.getElementsByName("deckName")

	heal.addEventListener("click", function(){updateMatch(0)})
	hit.addEventListener("click", function(){updateMatch(1)})
	divide.addEventListener("click", function(){updateMatch(2)})
	close.addEventListener("click", closeMatch)
	d6.addEventListener("click", randomNumber)

	for(i = 0; i < decks.length; i++)
		decks[i].addEventListener("click", function(){updateMatch(3, this)})
}



function randomNumber()
{
	var value = Math.floor(Math.random() * 6) + 1;
	document.getElementById("randomN").innerHTML= value
}

/*
0. heal
1. hit
2. divide
*/
function updateMatch(type, deckName)
{
	var amount = document.getElementById("amount").value
	var id = document.getElementById("id").innerHTML
	if(deckName)
		var deck = deckName.innerHTML
	console.log(deck)
	$.ajax(
	{
		url: '/battle',
		method: 'put',
		data:
		{
			amount: amount,
			id: id,
			deck: deck,
			type: type
		},
		//potrei in caso di successo aggiornare la pagina
		success: function success(result){console.log(result)},
		error: function error(r, e, s){console.log(e + " " + s)
		console.log(r)}
	})
}

function closeMatch()
{
	var id = document.getElementById("id").innerHTML
	console.log(id)
	$.ajax(
	{
		url: '/battle',
		method: 'delete',
		data:
		{
			id: id
		},
		success: function success(result){console.log(result)},
		error: function error(){console.log("cannot delete match")}
	})
}