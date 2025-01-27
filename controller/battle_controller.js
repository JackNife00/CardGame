var express = require('express')
var util = require('../utility.js')
var battle = require('../model/battle_model.js')
var deck = require('../model/deck_model.js')

//ritorna tutti i match
async function getBattles(req, res)
{
	util.trackRequest('/battle', req)
	var matches = await battle.getMatches()
	if(!matches)
	{
		res.status(404).json({message: 'nessun match trovato'})
		return false
	}
	res.status(200).json({matches: matches})
	return true
}

//ritorna tutti i match di un utente
async function getUserBattles(req, res)
{
	util.trackRequest('/:username/battle', req)
	var matches = await battle.getMatches()
    var matches = await battle.getUserMatches(req.params.username)
    if(!matches)
    {
        res.status(404).json({message: "nessuna partita trovata"})
        return false
    }
    res.status(200).json({matches: matches})

}

//ritorna il match con id passato
async function getBattle(req, res)
{
	util.trackRequest('/battle/:id', req)
	var matches = await battle.getMatches()
    var match = await battle.getById(req.params.id)
    if(!match)
	{
        res.status(404).json({message: "match non trovato"})
        return false
    }
    res.status(200).json({match: match})
    return true
}

async function join(username, id)
{
    var match = await battleInfo(id, username)
    if((match.host == username || match.guest == username) && match.inCourse == 1)
        return match
    else if(match.guest == 'waiting')
    {
        var result = await battle.joinGuest(username, id)
        var match = await battleInfo(id)
        if(!result)
            return false
        return match
    }
    return false
}

//costruisco un ogetto contenente le informazioni utili per il match
async function battleInfo(idGame, username)
{
    var rows = await battle.getById(idGame)
    if(username == rows.host)
        var decks = await deck.getOwnersDeck(username)
    else if(username == rows.guest)
        var decks = await deck.getOwnersDeck(username)
    var match =
        {
            id: rows.id,
            host: rows.host,
            guest: rows.guest,
            deckHost: rows.deckHost,
            deckGuest: rows.deckGuest,
            lph: rows.lpHost,
            lpg: rows.lpGuest,
            inCourse: rows.inCourse,
            decks: decks
        }
    return match
}

//crea un nuovo match e lo ritorna 
async function createBattle(req, res)
{
    if(!await util.isLogged(req, res))
        return false
	util.trackRequest('/battle', req)
	//l'host entra in partita senza dover selezionare il mazzo
	var result = await battle.newBattle(req.user.username)
	if(result)
    {
        var match = await battle.getById(result.insertId)
        res.status(200).json({match: match})
        return true
    }
	else
    {
        res.status(400).json({message: "impossibile creare la partita"})
		return false
    }
}

/*
posso aggiungere togliere o dividere gli lp
posso anche selezionare un mazzo per un utente
*/
async function updateBattle(req, res)
{
    if(!await util.isLogged(req, res))
        return false
	util.trackRequest('battle', req)
	var rows = await battle.getById(req.body.id)
    var username = req.user.username

	//mi serve verificare s el'utente è host o guest
	if(username == rows.host)
	{
		var toUpdate = "deckHost"
		var lp = "lpHost"
	}
	else if(username == rows.guest)
	{
		var toUpdate = "deckGuest"
		var lp = "lpGuest"
	}

	var type =parseInt(req.body.type)
	var amount = parseInt(req.body.amount)
	var id = req.body.id

	//in base al tipo di richiesta so cosa devo modificare
	switch(type)
	{
		case 0:
			var result = await battle.heal(amount, id, lp)
			if(result)
			{
				res.status(200).json({message: 'punti vita aggiornati'})
				return true
			}
			else
			{
				res.status(400).json({message: 'punti vita non aggiornati'})
				return false
			}
			break;

		case 1:

			var result = await battle.hit(amount, id, lp)
			if(result)
			{
				res.status(200).json({message: 'punti vita aggiornati'})
				return true
			}
			else
			{
				res.status(400).json({message: 'punti vita non aggiornati'})
				return false
			}
			break;

		case 2:

			var result = await battle.divide(amount, id, lp)
			if(result)
			{
				res.status(200).json({message: 'punti vita aggiornati'})
				return true
			}
			else
			{
				res.status(400).json({message: 'punti vita non aggiornati'})
				return false
			}
			break;

		case 3:
			var result = await battle.setDeck(id, req.body.deck, toUpdate)
			if(result)
			{
				res.status(200).json({message: 'mazzo aggiornato'})
				return true
			}
			else
			{
				res.status(200).json({message: 'mazzo non aggiornato'})
				return false
			}
			break;
        case 4:
            var match = await join(username, id)
            if(match)
            {
                res.status(200).json(match)
                return true
            }
           else
            {
                res.status(400).json({message: 'errore'})
                return false
            }
            break;

		default:
			res.status(400).json({message: 'tipo di aggiornamento non trovato'})
			return false;
			break;
	}
	return true
}

//renderizza alla pagina del match
async function renderBattle(req, res)
{
    if(!await util.isLogged(req, res))
        return false
	util.trackRequest('/match/:id', req)
    var match = await battleInfo(req.params.id, req.user.username)
    if(match)
    {
        res.status(200).render('battle.ejs', match)
        return true
    }
    res.status(400).json({message: "errore impossibile accedere alla partita"})
}

/*
viene chiamata appena viene effetuata una delete di un match
*/
async function endBattle(req, res)
{
    //modificare la chiusra, rendere disponibile solo all'host
    if(!await util.isLogged(req, res))
        return false
	util.trackRequest('/battle', req)
	var match = await battle.getById(req.body.id)
	var player = isInGame(match, req.user.username)
    /*
        solo l'host può chiudere la partita, in questo modo se chi chiama la delete
        è l'host chiudo la partita e ritorno il match che è stato appena chiuso
    */
	if(player == "host")
    {
        await setWinner(match)
        await battle.close(req.body.id)
        res.status(200).json(match)
    }

    else
    {
        res.status(405).json({message: 'non autorizzato'})
        return true
    }
}

//ritorna host o guest se il player è uno di loro altrimenti ritorna false
function isInGame(match, player)
{
	if(match.host == player)
		return "host"
	if(match.guest == player)
		return "guest"
	return false
}

//calcola chi ha più punti vita e setta winner e loser
async function setWinner(match)
{
	var winner = match.host
	var loser = match.guest
	if(match.lpHost < match.lpGuest)
	{
		winner = match.guest
		loser = match.host
	}
	await battle.setWinner(match.id, winner, loser)
}

module.exports={getBattles, renderBattle, getUserBattles, getBattle, join, createBattle, updateBattle, endBattle}
