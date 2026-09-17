# Changelog

## [2.0.0](https://github.com/cheminfo/ocl-cache.cheminfo.org/compare/v1.1.1...v2.0.0) (2026-09-17)


### ⚠ BREAKING CHANGES

* serve a React frontend, and record when a molecule was cached
* the database moved from ./sqlite to ./data/sqlite. Run `mkdir -p data/sqlite && mv sqlite/db.sqlite* data/sqlite/` before starting.

### Features

* migrate to node:sqlite and current standards ([7db4ae9](https://github.com/cheminfo/ocl-cache.cheminfo.org/commit/7db4ae9801488ea93909f30ebde86f6faed7572b))
* serve a React frontend, and record when a molecule was cached ([d21fd35](https://github.com/cheminfo/ocl-cache.cheminfo.org/commit/d21fd35f47f9302a8d61a383a344c213e9a115e1))


### Bug Fixes

* publish and pull ghcr.io/cheminfo/ocl-cache.cheminfo.org ([5487021](https://github.com/cheminfo/ocl-cache.cheminfo.org/commit/5487021d1004b6d47aa5368be8bfc943a0e1b97f))
* read the import queues from DATA_DIR ([c4824a6](https://github.com/cheminfo/ocl-cache.cheminfo.org/commit/c4824a6d5f37ed829448582023968ce7fc86e5bb))
* size the worker pool by the container's CPU quota, not the host's cores ([dc51959](https://github.com/cheminfo/ocl-cache.cheminfo.org/commit/dc519591bd1808a339529e4f1f06563ddfc5d089))


### Performance Improvements

* **stats:** refresh from the new molecules only, and spill the sort to disk ([d6dafcf](https://github.com/cheminfo/ocl-cache.cheminfo.org/commit/d6dafcfc8d408cf8e48e5c3710bbb0ed777fc521))

## [1.1.1](https://github.com/cheminfo/ocl-cache/compare/v1.1.0...v1.1.1) (2025-04-02)


### Bug Fixes

* export correct port and traefik example ([9032963](https://github.com/cheminfo/ocl-cache/commit/9032963970628dd2be248ddf42bc54e3f9ced71e))

## [1.1.0](https://github.com/cheminfo/ocl-cache/compare/v1.0.0...v1.1.0) (2025-03-07)


### Features

* add appendIDCodeStream ([b50db84](https://github.com/cheminfo/ocl-cache/commit/b50db844091d9e313d6f7c735ae7cf5e589cef4c))
* add docker image builder ([7fef635](https://github.com/cheminfo/ocl-cache/commit/7fef635c542ce04c0653df221776ac71d7979546))
* add failedTautomerID to be able to recover the failed tautomer ID in the future ([7334e8e](https://github.com/cheminfo/ocl-cache/commit/7334e8e3038ea3106060f912f37e9aeb7b416538))


### Bug Fixes

* decode text of stream ([9810ac8](https://github.com/cheminfo/ocl-cache/commit/9810ac8740f68b04a0736d8f84f2aa01e94b2fd0))
* importation scripts ([a8969b9](https://github.com/cheminfo/ocl-cache/commit/a8969b9b6369e7849d44718a46cc5e07dadb91d1))
* move imported files ([313ddcf](https://github.com/cheminfo/ocl-cache/commit/313ddcf29e4c1cdaae94d8a34a11fdfbe90cbd82))
* ssIndex type in a number[] ([bf98135](https://github.com/cheminfo/ocl-cache/commit/bf981354a6a081d9c07ceba8a15ba62a83d4a9d5))

## 1.0.0 (2025-02-25)

### Features

- add back pressure ([9c49422](https://github.com/cheminfo/ocl-cache/commit/9c49422a6ee1bbf1a946a6928ce503ab7fe7c117))
- add compose traefik example ([d4bac18](https://github.com/cheminfo/ocl-cache/commit/d4bac18de5fb9655f8516cc066c9c15be62957bf))
- add fastify swagger server ([f2699ac](https://github.com/cheminfo/ocl-cache/commit/f2699acd5a8db5dd6caf77a1ea125b5930233c27))
- allow appendSDF from stream ([85cc87d](https://github.com/cheminfo/ocl-cache/commit/85cc87d35fb57f5b965b7a00191fbf74589bd6a7))
- allow to processSDF from docker ([beb9139](https://github.com/cheminfo/ocl-cache/commit/beb91395eb83ac0563f0cd4631da511d84d02c31))
- refactor to use docker ([fe96794](https://github.com/cheminfo/ocl-cache/commit/fe96794a3871869e11431726e85cb6e9297c2782))
- script to fix ocl cache ([10d39c1](https://github.com/cheminfo/ocl-cache/commit/10d39c1f6ebcfb12902372d0909df8a466e041c2))

### Bug Fixes

- add compose.yml in .gitignore ([793e6ae](https://github.com/cheminfo/ocl-cache/commit/793e6ae9120060acf985137f817dc82f033539ab))
- add delay for tautomer to 60s ([14a93a3](https://github.com/cheminfo/ocl-cache/commit/14a93a3e45b425e5c3643afbcff65ec95cbc9098))
- add fragments to MoleculeInfo type ([d57adbf](https://github.com/cheminfo/ocl-cache/commit/d57adbf776dc5c99d42e330fdcb40edc6d2958c2))
- after mass-tools update atoms and unsaturation sum are available ([617a7e4](https://github.com/cheminfo/ocl-cache/commit/617a7e48f4d678e08ebfdf2504f07b66043fb86a))
- allow rename of zip files ([e03c3bf](https://github.com/cheminfo/ocl-cache/commit/e03c3bfbbd1506595d608d927d22e4a963233737))
- catch error when calculating ([4444441](https://github.com/cheminfo/ocl-cache/commit/44444413303d74f21fea800e1dfe57b291d57eb5))
- checkpoint every 300s ([9392587](https://github.com/cheminfo/ocl-cache/commit/93925872f633d128de94dfa0d670013e859de799))
- conflict ([d4eaf44](https://github.com/cheminfo/ocl-cache/commit/d4eaf445e5e34ffb4ec9554d0d70410fb0e01486))
- conflict ([fa1b105](https://github.com/cheminfo/ocl-cache/commit/fa1b105b836e728a2579dd1bc641bf163f5df017))
- conflict ([c1fc4aa](https://github.com/cheminfo/ocl-cache/commit/c1fc4aada247300b86c22bee0291b539dfa58ae2))
- correctly return atoms as an object ([43d9b66](https://github.com/cheminfo/ocl-cache/commit/43d9b662b40ff2ee5f8f4255a272a3089ad01a30))
- data type and column name ([44fc325](https://github.com/cheminfo/ocl-cache/commit/44fc32542a70c5f30ee02fa6ee59bd5a1152b79a))
- headers where in wrong order ([1910156](https://github.com/cheminfo/ocl-cache/commit/1910156191c32b61f853c12752151cbe0c1048f9))
- limit journal size to ([dd09304](https://github.com/cheminfo/ocl-cache/commit/dd0930464dc6afc6187bede52596f788626410f0))
- merge test ([826533f](https://github.com/cheminfo/ocl-cache/commit/826533fe428d2cf4c200a6ff32f58504cab276d0))
- missing molfile for test ([b3bd314](https://github.com/cheminfo/ocl-cache/commit/b3bd31407c95dc9aba02bed57d39b4721b644c5b))
- remove exit ([ef3e818](https://github.com/cheminfo/ocl-cache/commit/ef3e8182e5c97d13102e587c08e12a96c8dd5124))
- remove unused import ([5ab0c8d](https://github.com/cheminfo/ocl-cache/commit/5ab0c8d2e93612c8fc2f2cee2e92795166acf8c1))
- renameSync to_process process ([e208533](https://github.com/cheminfo/ocl-cache/commit/e208533dec051e46c917f527f93b63e2dc9ae325))
- restore missing file ([8158c9b](https://github.com/cheminfo/ocl-cache/commit/8158c9b9a835f9d56c8e8590d2bf5cb9d41bc447))
- reuse of const variable ([5a8030c](https://github.com/cheminfo/ocl-cache/commit/5a8030ccacdc8ff7cfc86c4bc310f771e66b96a3))
- ssIndex conversion ([530ec80](https://github.com/cheminfo/ocl-cache/commit/530ec80b9ba06fb1928f67c3ee3534bd73bebc58))
- test ([633094f](https://github.com/cheminfo/ocl-cache/commit/633094f0bc11248b31d39089b8d965532545e771))
- test cases ([e97b6e8](https://github.com/cheminfo/ocl-cache/commit/e97b6e82547b13a182b1d6495fcb8c1507f82d5e))
- type error ([efdb2ae](https://github.com/cheminfo/ocl-cache/commit/efdb2ae9588c7690433e162e4967e3256533bbe3))
- update snapshot ([dc3b663](https://github.com/cheminfo/ocl-cache/commit/dc3b6636fceea990fd75080234dabe0b70bf11c3))
- use docker bridge network ([2fea97b](https://github.com/cheminfo/ocl-cache/commit/2fea97bead4f1bdd605ba630f1625ddf86e90176))
- use file-collection instead of filelist-utils ([6685c3f](https://github.com/cheminfo/ocl-cache/commit/6685c3f3627399482ff9b3b2eb595b76e8bbe394))
- use max 50K promises ([fe9deb7](https://github.com/cheminfo/ocl-cache/commit/fe9deb7afec6e7d86ab52003f77cdbc7fc9cc07c))
- use path to db ([7f5ec4a](https://github.com/cheminfo/ocl-cache/commit/7f5ec4ac1ea644c6ac048b167ba039b43195fee4))
