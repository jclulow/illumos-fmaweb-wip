.PHONY: all
all: 0-npm-stamp

0-npm-stamp: package.json
	rm -rf $(PWD)/node_modules
	npm install
	touch $@

clean:
	rm -f 0-npm-stamp
	rm -rf node_modules
