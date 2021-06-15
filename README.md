# AlgoHub 백엔드

### 개발 스택
1. Node.js(Express.js)    

 
2. 데이터베이스(MySql, Redis)
    Redis의 경우 로그인을 할 떄 사용되며 세션 정보(userId)를 저장할 때 사용하게 되었습니다. userId는 자주 조회되는 정보이기 때문에 인메모리 데이터베이스인 Redis를 사용하였습니다.   


3. ElasticSearch + nori(한글 형태소 분석기)
    * 빠른 검색을 구현하기 위해 역 인덱스(inverted index)를 이용하는 ElasticSearch를 사용하였습니다.     
    * 좀더 정확한 검색을 위해 유사어를 설정하였습니다.(ex.[백준, baekjoon, boj], [dfs, depth first search, 깊이 우선 타색], ...)
    * 게시물의 제목(title)과 메모(memo)에 대하여 검색을 진행하였으며 사용자들이 검색이 제목에 좀 더 초점이 맞춰 있을 것으로 생각되어 제목(title)에 가중치를 적용하였습니다.   


4. Docker
   * 좀더 쉬운 배포를 위해 사용하였습니다.
   * nginx(for reverse proxy), frontend, backend에 해당하는 컨테이너를 생성하였습니다.
    

5. nginx
   * 하나의 인스턴스에서 frontend와 backend를 분리하기 위해 사용하였습니다.
   * reverse proxy를 이용하여 보안을 높여주기 위해서 사용하였습니다. 
    
    
6. AWS(EC2, RDS, Route 53)
   * 배포 환경입니다.
   * 프론트엔드와 백엔드 인스턴스로서는 EC2를 사용하였습니다.
   * EC2 인스턴스에서 데이터베이스를 함께 사용할 수 있지만 보안을 위해 데이터베이스를 RDS로 분리하였습니다.
   * freenom에서 받은 도메인 이름을 적용하기 위해 Route 53를 사용하였습니다.



### 프론트엔드 레파지토리    
실제 프로젝트 모습은 아래 링크를 통해 확인하 실 수 있습니다.
https://github.com/yshjft/capstone_frontend

### 배포 주소
http://mjualgohub.tk
