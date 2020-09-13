const path = require('path');
const db = require('../models/database.js');
const Items = require('../models/ItemModel.js')
const Bundles = require('../models/BundleModel.js')
const Artists = require('../models/ArtistModel.js');
const { send } = require('process');

const mainController = {
    //Render main page
    getMain: function(req, res, next){

        //  if the logged in user is not an admin, therefore a cashier
        if (req.session.isAdmin == false || true) {      

            const getIncome = async function(artistID) {
                return new Promise(function (resolve, reject) {
                    db.findMany(Items, {artistID: artistID}, 'itemsSold itemPrice', function (itemRes) {
                        var income = 0;

                        for (let j = 0; j < itemRes.length; j++) {
                            income += (itemRes[j].itemsSold * itemRes[j].itemPrice)
                        }

                        db.findMany(Bundles, {artistID: artistID}, 'bundleSold bundlePrice', function (bundleRes) {
                            for (let k = 0; k < bundleRes.length; k++) {
                                income += (bundleRes[k].bundleSold * bundleRes[k].bundlePrice)
                            }

                            console.log(income)
                            resolve(income)
                        })
                    })
                })
            }   

            const getTotalSold = async function() {
                return new Promise(function (resolve, reject) {
                    db.findMany(Items, {}, '-_id itemsSold', function (itemRes) {
                        var items = itemRes.map(function(i) { return i.itemsSold})
                                            .reduce(function(t, n) { return t + n})

                        db.findMany(Bundles, {}, '-_id bundleSold', function (bundleRes) {
                            var bundles = bundleRes.map(function(b) { return b.bundleSold})
                                                    .reduce(function(t, n) { return t + n})
                            
                            resolve(items + bundles)
                        })
                    })
                })
            }

            const getDetails = async (artists) => {
                let totalItems = await getTotalSold()
                
                for (let i = 0; i < artists.length; i++) {
                    let income = 0;
                    artists[i].income = await getIncome(artists[i].artistID)
                }
                
                var details = {
                    artist: artists,
                    totalSold: totalItems
                }

                res.render('main', details)
            };
            
            //find artist then render with details
            db.findMany(Artists, {}, 'artistID artistName', result=>{
            
                let artistArray = result;
                let totalItems = 0;
                
                artistArray = getDetails(artistArray)
            })
        } 
        
        // if the logged in user is an admin
        else if (req.session.isAdmin) {
            res.redirect('/admin')
        } 
        
        // if the user is not logged in
        else res.redirect('/')
    },

    /*  new order decrements stockQuantity and increments itemSold */
    postOrderCheckOut: function(req, res, next){
        var items = req.body.items
        var bundles = req.body.bundles
        var success = true;
        
        for (let i = 0; items && i < items.length; i++) {
            
            db.findOne(Items, {_id: items[i].itemID}, 'stockQuantity itemsSold', function(result) {
                
                if (result) {
                    var update = {
                        stockQuantity: result.stockQuantity - parseInt(items[i].quantity),
                        itemsSold: result.itemsSold + parseInt(items[i].quantity)
                    }

                    db.updateOne(Items, {_id: items[i].itemID}, update, function(result1) {
                        success = result
                    })
                    
                }
                else {
                    console.log('Item ' + items[i].itemID + ' not found in the collection.')
                }
            })
        }
        
        for (let i = 0; bundles && i < bundles.length; i++) {
            
            db.findOne(Bundles, {_id: bundles[i].itemID}, 'bundleStock bundleSold', function(result) {
                
                if (result) {
                    var update = {
                        bundleStock: result.bundleStock - parseInt(bundles[i].quantity),
                        bundleSold: result.bundleSold + parseInt(bundles[i].quantity)
                    }

                    db.updateOne(Bundles, {_id: bundles[i].itemID}, update, function(result1) {
                        success = success && result1
                    })
                    
                }
                else {
                    console.log('Bundle ' + bundles[i].itemID + ' not found in the collection.')
                }
            })
        }
        res.send(success)

    },

    /*  add stocks increments stockQuantity */
    postRestock: function(req, res, next){

        if (req.body.itemType == 'item') {
            db.findOne(Items, {_id: req.body.item}, 'stockQuantity', function(result) {
                    
                if (result) {
                    var update = {
                        stockQuantity: result.stockQuantity + parseInt(req.body.value),
                    }
                    db.updateOne(Items, {_id: req.body.item}, update, function(result1) {
                        res.send(result1)
                    })
                }
                else {
                    console.log('Item ' + req.body.item + ' not found in the collection.')
                }
            })
        } else {
            db.findOne(Bundles, {_id: req.body.item}, 'bundleStock', function(result) {
                    
                if (result) {
                    var update = {
                        bundleStock: result.bundleStock + parseInt(req.body.value),
                    }
                    db.updateOne(Bundles, {_id: req.body.item}, update, function(result1) {
                        res.send(result1)
                    })
                }
                else {
                    console.log('Bundle ' + req.body.item + ' not found in the collection.')
                }
            })
        }
    },

    /*  returns all items of a specific artist */
    getItems: function(req, res, next){
        db.findMany(Items, {artistID: req.query.artistID}, req.query.projection, function(result) {
                
            if (result.length > 0) {
                res.send(result)
            }
            else {
                console.log('Artist ' + req.query.artistID + ' not found in the collection.')
                res.send(false)
            }
        })
    },

    /*  returns all bundles of a specific artist */
    getBundles: function(req, res, next){
        db.findMany(Bundles, {artistID: req.query.artistID}, req.query.projection, function(result) {
                
            if (result.length > 0) {
                res.send(result)
            }
            else {
                console.log('Artist ' + req.query.artistID + ' not found in the collection.')
                res.send(false)
            }
        })
    },
    
}

module.exports = mainController;