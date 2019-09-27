const express = require('express')

const passport = require('passport')

// pull in Mongoose model for items
const Item = require('../models/item')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
router.get('/items', requireToken, (req, res, next) => {
  Item.find({ owner: req.user.id })
    .then(items => {
      items.map(item => item.toObject())
      return items.reverse()
    })
    .then(items => res.status(200).json({ items: items }))
    .catch(next)
})

// CREATE
router.post('/items', requireToken, (req, res, next) => {
  // set owner of new example to be current user
  req.body.item.owner = req.user.id

  Item.create(req.body.item)
    .then(item => {
      res.status(201).json({ item: item.toObject() })
    })
    .catch(next)
})

router.patch('/items/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  // delete req.body.example.owner

  Item.findById(req.params.id)
    .then(handle404)
    .then(item => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, item)

      // pass the result of Mongoose's `.update` to the next `.then`
      return item.updateOne(req.body.item)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// SHOW
router.get('/items/:id', requireToken, (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  Item.findById(req.params.id)
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "example" JSON
    .then(item => {
      requireOwnership(req, item)
    })
    .then(item => res.status(200).json({ item: item.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DELETE
router.delete('/items/:id', requireToken, (req, res, next) => {
  Item.findById(req.params.id)
    .then(handle404)
    .then(item => {
      // throw an error if current user doesn't own `example`
      requireOwnership(req, item)
      // delete the example ONLY IF the above didn't throw
      item.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})
module.exports = router
