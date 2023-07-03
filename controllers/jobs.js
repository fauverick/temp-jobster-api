const Job = require('../models/Job')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, NotFoundError } = require('../errors')

const mongoose = require('mongoose')
const moment = require('moment')

const getAllJobs = async (req, res) => {

  //filtering

  const {search, status, jobType, sort} = req.query
  const queryObject = {
    createdBy: req.user.userId
  }

  if(search){
    queryObject.position = {$regex: search, $options: 'i'} //$options: 'i' means the filter for the search field is not case-sensitive, $regex is to find data that contains the search field
  }

  if(status && status!='all'){
    queryObject.status = status
  }

  if(jobType && jobType!='all'){
    queryObject.jobType = jobType
  }

  let result = Job.find(queryObject) // NO AWAIT because the data needs to finish being filtered before we move on to the folliwng steps (sorting the data)
  
  //sorting 

  if(sort === 'latest'){
    result = result.sort('-createdAt')
  }
  if(sort === 'oldest'){
    result = result.sort('createdAt')
  }
  if(sort === 'a-z'){
    result = result.sort('position')
  }
  if(sort === 'z-a'){
    result = result.sort('-position')
  }
  
  // pagination

  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const skip = (page-1) * limit;

  result = result.skip(skip).limit(limit)

  
  const jobs = await result
  const totalJobs = await Job.countDocuments(queryObject)
  const numOfPages = Math.ceil(totalJobs/limit)

  res.status(StatusCodes.OK).json({ jobs, totalJobs, numOfPages})
}
const getJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findOne({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const createJob = async (req, res) => {
  req.body.createdBy = req.user.userId
  const job = await Job.create(req.body)
  res.status(StatusCodes.CREATED).json({ job })
}

const updateJob = async (req, res) => {
  const {
    body: { company, position },
    user: { userId },
    params: { id: jobId },
  } = req

  if (company === '' || position === '') {
    throw new BadRequestError('Company or Position fields cannot be empty')
  }
  const job = await Job.findByIdAndUpdate(
    { _id: jobId, createdBy: userId },
    req.body,
    { new: true, runValidators: true }
  )
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  console.log("hello bitches")
  res.status(StatusCodes.OK).json({ job })
}

const deleteJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findByIdAndRemove({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).send()
}

const showStats = async (req, res) => {

  let stats = await Job.aggregate([
    {$match: {createdBy : mongoose.Types.ObjectId(req.user.userId)}} , //read the MongoDB aggreagation pipeline to understand more
    //$match to filter out jobs that are created by the current user

    {$group: {_id:'$status', count: {$sum: 1} }}

    //$group{_id: $something} to categorize data of the something field, in this case it is status,  $sum: 1 to count the total number of jobs belonging to that field
  ])

  //the code below is to refactor the aggregated data for the frontend, see the console.log(stats) results to see the results

  console.log(stats)

  stats = stats.reduce((acc, curr) => {
    const {_id:title, count} = curr 
    acc[title] = count;
    return acc;
  }, {})


  const defaultStats = {
    pending: stats.pending || 0,
    interview: stats.interview || 0,
    declined: stats.declined || 0,
  };

  console.log(stats)
  console.log(defaultStats)



  let monthlyApplications = await Job.aggregate([
    {$match: {createdBy : mongoose.Types.ObjectId(req.user.userId)}} , //read the MongoDB aggreagation pipeline to understand more

    {$group: {
      _id: {year: {$year: '$createdAt'}, month: {$month: '$createdAt'}}, //we group the applications by each month of each year, that's why there are 2 ids to categorize here (Ex: 09/2021 is different from 09/2022)
      count: {$sum: 1} }
    } ,

    {$sort: {'_id.year': -1, '_id.month': -1}},
    {$limit: 6}

  ])

  console.log(monthlyApplications)

  monthlyApplications = monthlyApplications.map((item) => {
    const {
      _id: {year, month}, 
      count
    } = item

    const date = moment().month(month-1).year(year).format('MMM Y') //REMEMBER THE MONTH-1 IDK WHY
    return {date, count}

  }).reverse()

  console.log(monthlyApplications)
  res.status(StatusCodes.OK).json({defaultStats, monthlyApplications})
}

module.exports = {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  showStats
}
