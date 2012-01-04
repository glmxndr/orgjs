#! /bin/bash
node build/make.js &
python -m SimpleHTTPServer 3000 &
