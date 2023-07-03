const User = require('../models/User')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, UnauthenticatedError } = require('../errors')
const { use } = require('express/lib/router')

const register = async (req, res) => {
  const user = await User.create({ ...req.body })
  const token = user.createJWT()
  res.status(StatusCodes.CREATED).json({ 
    user: {
       name: user.name,
       lastName: user.lastName,
       email: user.email,
       location: user.location,
       token
    } 
  })
}

const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw new BadRequestError('Please provide email and password')
  }
  const user = await User.findOne({ email })
  if (!user) {
    throw new UnauthenticatedError('Invalid Credentials')
  }
  const isPasswordCorrect = await user.comparePassword(password)
  if (!isPasswordCorrect) {
    throw new UnauthenticatedError('Invalid Credentials')
  }
  // compare password
  const token = user.createJWT()
  res.status(StatusCodes.CREATED).json({ 
    user: {
       name: user.name,
       lastName: user.lastName,
       email: user.email,
       location: user.location,
       token
    } 
  })
}

const updateUser = async(req, res) => {

  //the req.body includes email, name, lastName, location; the req.user includes userId and name
  const{email, lastName, name, location} = req.body
  console.log(req.user)
  if(!email || !lastName || !name || !location){
    throw new BadRequestError('Please provide all values')
  }
  const user = await User.findOne({_id: req.user.userId});
  //the bellow is an alternative to findOneAndUpdate to update user infos
  user.name = name;
  user.email = email;
  user.lastName = lastName;
  user.location = location;

  await user.save();

  //we need to create new token because new name leads to new token
  const token = user.createJWT();

  res.status(StatusCodes.CREATED).json({ 
    user: {
       name: user.name,
       lastName: user.lastName,
       email: user.email,
       location: user.location,
       token
    } 
  })
}

module.exports = {
  register,
  login,
  updateUser,
}
