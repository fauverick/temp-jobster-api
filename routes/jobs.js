const express = require('express')
const testUser = require('../middleware/testUser')


const router = express.Router()
const {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  showStats,
} = require('../controllers/jobs')

router.route('/').post(testUser,createJob).get(getAllJobs)

router.route('/stats').get(showStats); //SOMEHOW WHEN I PUT THIS BELOW THE router.route('/:id') it does not work

router.route('/:id').get(getJob).delete(testUser, deleteJob).patch(testUser, updateJob)


module.exports = router
