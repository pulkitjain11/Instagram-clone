const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = mongoose.model("User")
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {JWT_SECRET} = require('../config/keys')
const requireLogin = require('../middleware/requireLogin')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')

router.post('/reset-password',(req,res)=>{
    crypto.randomBytes(32),(err,buffer)=>{
        if(err){
            console.log(err)
        }
        const token = buffer.toString("hex")
        User.findOne({email:req.body.email})
        .then(user=>{
            if(!user){
                return res.status(422).json({error:"No User found with this Email Id"})
            }
            user.resetToken = token
            user.expireToken = Date.now() + 900000
            user.save().then((result)=>{
                transporter.sendMail({
                    to:user.email,
                    from:"abc@gmail.com",
                    subject:"Password Reset",
                    html:`
                    <p>You have requested for password reset.</p>
                    <h4>Click on this <a href="http://localhost:3000/reset/${token}">link</a> to reset password</h4>
                    `
                })
                res.json({message:"Check your email for password reset link."})
            })
        })
    }
})

router.post('/signup',(req,res)=>{
  const {name,email,password,pic} = req.body 
  if(!email || !password || !name){
     return res.status(422).json({error:"Please add all the fields"})
  }
  User.findOne({email:email})
  .then((savedUser)=>{
      if(savedUser){
        return res.status(422).json({error:"User already exists with that email"})
      }
      bcrypt.hash(password,12)
      .then(hashedpassword=>{
            const user = new User({
                email,
                password:hashedpassword,
                name,
                pic
            })
    
            user.save()
            .then(user=>{
                transporter.sendMail({
                    to:user.email,
                    from:"pulkitjainjk@gmail.com",
                    subject:"Sign Up Successful",
                    html:"<h1>Welcome to Show your Skills</h1>"
                })
                    res.json({message:"Saved successfully"})
                
            })
            .catch(err=>{
                console.log(err)
            })
      })
     
  })
  .catch(err=>{
    console.log(err)
  })
})


router.post('/signin',(req,res)=>{
    const {email,password} = req.body
    if(!email || !password){
       return res.status(422).json({error:"Please add email or password"})
    }
    User.findOne({email:email})
    .then(savedUser=>{
        if(!savedUser){
           return res.status(422).json({error:"Invalid Email or password"})
        }
        bcrypt.compare(password,savedUser.password)
        .then(doMatch=>{
            if(doMatch){
               const token = jwt.sign({_id:savedUser._id},JWT_SECRET)
               const {_id,name,email,followers,following,pic} = savedUser
               res.json({token,user:{_id,name,email,followers,following,pic}})
            }
            else{
                return res.status(422).json({error:"Invalid Email or password"})
            }
        })
        .catch(err=>{
            console.log(err)
        })
    })
})

router.post('/new-password',(reqq,res)=>{
    const newPassword = req.body.password
    const sentToken = req.body.token
    User.findOne({resetToken:sentToken,expireToken:{$gt:Date.now()}})
    .then(user=>{
        if(!user){
            return res.status(422).json({error:"Try again! Session Expired"})
        }
        bcrypt.hash(newPassword,12).then(hashedpassword=>{
            user.password = newPassword
            user.resetToken = undefined
            user.expireToken = undefined
            user.save().then((saveduser)=>{
                res.json({message:"Password Updated"})
            })
        })
    }).catch(err=>{
        console.log(err)
    })
})
module.exports = router
