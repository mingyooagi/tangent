const { withTangent } = require('next-plugin-tangent')

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = withTangent()(nextConfig)
