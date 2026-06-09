# 超级媒介代理商接入API文档

## 目录

1. [通用说明](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#1-通用说明)
2. [获取新闻媒体资源](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#2-获取新闻媒体资源)
3. [查询新闻媒体资源](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#3-查询新闻媒体资源)
4. [创建新闻媒体订单](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#4-创建新闻媒体订单)
5. [新闻媒体订单催稿](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#5-新闻媒体订单催稿)
6. [新闻媒体订单取消](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#6-新闻媒体订单取消)
7. [新闻媒体订单申请退款](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#7-新闻媒体订单申请退款)
8. [新闻媒体订单申请补发](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#8-新闻媒体订单申请补发)
9. [查询新闻媒体订单](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#9-查询新闻媒体订单)
10. [获取自媒体资源](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#10-获取自媒体资源)
11. [查询自媒体资源](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#11-查询自媒体资源)
12. [创建自媒体订单](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#12-创建自媒体订单)
13. [自媒体订单催稿](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#13-自媒体订单催稿)
14. [自媒体订单取消](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#14-自媒体订单取消)
15. [自媒体订单申请退款](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#15-自媒体订单申请退款)
16. [查询自媒体订单](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#16-查询自媒体订单)
17. [事件通知](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#17-事件通知)
18. [附录：所属地区](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#18-附录所属地区)
19. [附录：频道类型](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#19-附录频道类型)
20. [附录：综合门户](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#20-附录综合门户)
21. [附录：所属平台](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#21-附录所属平台)
22. [附录：行业分类](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#22-附录行业分类)
23. [附录：资源状态](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#23-附录资源状态)
24. [附录：订单状态](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#24-附录订单状态)
25. [附录：订单反馈信息](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#25-附录订单反馈信息)

## 1. 通用说明

### 请求地址

```
https://vip.chaojimeijie.com/api
```

### 公共请求参数

用于标识代理商和鉴权接口请求，每次请求接口请务必带上这些参数。

| **名称**      | **类型** | **必填** | **默认** | **说明**                                            |
| ------------- | -------- | -------- | -------- | --------------------------------------------------- |
| **appid**     | string   | Yes      | -        | 用于标识代理商                                      |
| **timestamp** | int      | Yes      | -        | 当前时间戳（10位），验证请求的时效性，5分钟内有效。 |
| **algorithm** | string   | No       | sha256   | 用于签名的散列算法名称，如：sha1，sha256等。        |
| **signature** | string   | Yes      | -        | 使用密钥对请求数据的签名                            |

### 公共响应数据

所有接口均以 JSON 格式返回，以下为公共的响应字段。

| **名称**    | **类型** | **说明**                             |
| ----------- | -------- | ------------------------------------ |
| **code**    | int      | 200 表示请求成功，其他表示请求失败   |
| **message** | string   | 响应结果描述信息                     |
| **data**    | mixed    | 业务数据，具体说明参见对应的接口文档 |

### 签名算法

计算签名按照下面的步骤进行：

1. 将所有请求参数（`signature` 除外）按参数名升序排列；如果参数值为**列表**，按列表**元素**升序排列；如果参数值为**字典**，按字典**键名**升序排列；然后将数组展平并拼接为一个字符串。
2. 使用 HMAC 方法生成带有密钥的散列值。

**PHP 示例代码（展平与签名）：**

PHP

```
function flatten(array $data, string $separator = ''): string
{
    $segments = [];
    if (array_is_list($data)) {
        sort($data); // 如果是列表，按照值升序排序    
        foreach ($data as $item) {
            $segments[] = is_array($item) ? flatten($item, $separator) : $item;
        }
    } else {
        ksort($data); // 如果是字典，按照键名升序排序       
        foreach ($data as $key => $item) {
            if ($key === 'signature') continue;
            $value = is_array($item) ? flatten($item, $separator) : $item;
            $segments[] = sprintf('%s=%s', $key, $value);
        }
    }    
    return implode($separator, $segments);
}

// 签名生成
$secret = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
$data = [
    'appid' => 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'timestamp' => time(),
    'algorithm' => 'sha256',
    'other' => '其他请求参数',
];
$data['signature'] = hash_hmac($data['algorithm'], flatten($data), $secret);
```

### 验证签名

PHP

```
$secret = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
$data = [
    'appid' => 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'timestamp' => time(),
    'algorithm' => 'sha256',
    'signature' => 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'other' => '其他请求参数',
];
$signature = hash_hmac($data['algorithm'], flatten($data), $secret);
hash_equals($signature, $data['signature']); // 验证结果
```

## 2. 获取新闻媒体资源

- **请求路径**：`/media/resource`
- **请求方式**：`GET`

### 请求参数说明

| **名称** | **类型** | **必填** | **默认** | **说明**                |
| -------- | -------- | -------- | -------- | ----------------------- |
| **page** | int      | No       | 1        | 页码                    |
| **size** | int      | No       | 20       | 每页个数，最大限制为200 |

### 响应数据说明（data 字典元素）

| **名称**  | **类型** | **说明** |
| --------- | -------- | -------- |
| **total** | int      | 资源总数 |
| **items** | list     | 资源列表 |

### 响应数据说明（data['items'] 列表元素）

| **名称**                     | **类型**      | **说明**                                                     |
| ---------------------------- | ------------- | ------------------------------------------------------------ |
| **id**                       | int           | 资源标识                                                     |
| **name**                     | string        | 资源名称                                                     |
| **entrance_link**            | string\|null  | 入口链接                                                     |
| **case_link**                | string        | 案例链接                                                     |
| **homepage_focus_image_url** | string\|null  | 首页焦点图片地址                                             |
| **homepage_recommend_time**  | string\|null  | 首页推荐时间，如：3小时/天                                   |
| **remark**                   | string\|null  | 备注说明                                                     |
| **price**                    | decimal(10,2) | 成本价格，单位：元                                           |
| **published_avg**            | int           | 平均发稿时间，单位：分钟                                     |
| **published_rate**           | int           | 发稿率，0 ~ 100                                              |
| **area**                     | int           | 所属地区，参见 [附录：所属地区](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#18-附录所属地区) |
| **link_type**                | int           | 链接类型： 1: 不带联系方式 3: 网址                           |
| **news_source**              | int           | 新闻源： 1: 非新闻源 2: 百度新闻源                           |
| **channel_type**             | int           | 频道类型，参见 [附录：频道类型](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#19-附录频道类型) |
| **publish_speed**            | int           | 发稿速度： 1: 一小时内 2: 二小时内 12: 半天 24: 当天 48: 隔天 49: 2天以上 |
| **entrance_level**           | int           | 入口级别： 1: 没有入口 2: 首页入口 3: 频道入口 4: 上级入口   |
| **special_industry**         | int           | 特殊行业： 1: 金融区块链 3: 党政加分 4: 健康 6: 白名单来源 7: 移动端媒体 8: 需要来源媒体 9: 首页焦点图/首页文字链 |
| **record_situation**         | int           | 收录情况： 1: 不包收录 2: 百度包收录                         |
| **comprehensive_portal**     | int\|null     | 综合门户，参见 [附录：综合门户](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#20-附录综合门户) |
| **pc_weight**                | int\|null     | 电脑端百度权重，0~9                                          |
| **mobile_weight**            | int\|null     | 手机端百度权重，0~9                                          |
| **can_weekend**              | boolean       | 周末是否可以发稿                                             |
| **status**                   | int           | 状态，参见 [附录：资源状态](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#23-附录资源状态) |

## 3. 查询新闻媒体资源

- **请求路径**：`/media/resource/query`
- **请求方式**：`GET`

### 请求参数说明

| **名称** | **类型** | **必填** | **默认** | **说明**                      |
| -------- | -------- | -------- | -------- | ----------------------------- |
| **id**   | list     | Yes      | -        | 资源id列表，最大长度限制为200 |

> **说明**：响应数据 `data` 为有效资源列表，详情数据字段说明与 **获取新闻媒体资源** 接口返回的 `data['items']` 列表一致。

## 4. 创建新闻媒体订单

- **请求路径**：`/media/order`
- **请求方式**：`POST`

### 请求参数说明

| **名称**            | **类型** | **必填** | **默认** | **说明**                                                     |
| ------------------- | -------- | -------- | -------- | ------------------------------------------------------------ |
| **sn**              | string   | Yes      | -        | 代理商订单号，必须唯一且最大长度限制为64                     |
| **resource_id**     | int      | Yes      | -        | 资源id                                                       |
| **title**           | string   | Yes      | -        | 稿件标题，最大长度限制为200，**需要urlencode处理。**         |
| **content**         | string   | Yes      | -        | 稿件内容预览地址，必须为正确的URL格式，**需要urlencode处理。** |
| **publish_limited** | date     | No       | null     | 限时发布时间，必须为正确的时间格式，推荐格式："Y-m-d\TH:i:sP"；必须晚于提交时间2小时；如果通过格式无法识别时区，默认以 **UTC** 时间为准。 |
| **remark**          | string   | No       | null     | 备注说明，最大长度限制为500，**需要urlencode处理。**         |
| **owner**           | string   | No       | null     | 稿件所属客户，最大长度限制为100，**需要urlencode处理。**     |

### 响应数据说明（data 字典元素）

| **名称**       | **类型** | **说明**               |
| -------------- | -------- | ---------------------- |
| **partner_sn** | string   | 超级媒介订单号（26位） |

## 5. 新闻媒体订单催稿

- **请求路径**：`/media/order/urge`
- **请求方式**：`POST`

### 请求参数说明

| **名称** | **类型** | **必填** | **默认** | **说明**     |
| -------- | -------- | -------- | -------- | ------------ |
| **sn**   | string   | Yes      | -        | 代理商订单号 |

## 6. 新闻媒体订单取消

> ⚠️ **注意**：只有状态为**待处理**的订单才可取消。

- **请求路径**：`/media/order/cancel`
- **请求方式**：`POST`

### 请求参数说明

| **名称**   | **类型** | **必填** | **默认** | **说明**       |
| ---------- | -------- | -------- | -------- | -------------- |
| **sn**     | string   | Yes      | -        | 代理商订单号   |
| **reason** | string   | Yes      | -        | 取消原因或理由 |

## 7. 新闻媒体订单申请退款

> ⚠️ **注意**：如果在发布中申请退款，不保证一定退款成功，最终以编辑为准。

- **请求路径**：`/media/order/apply-refund`
- **请求方式**：`POST`

### 请求参数说明

| **名称**   | **类型** | **必填** | **默认** | **说明**       |
| ---------- | -------- | -------- | -------- | -------------- |
| **sn**     | string   | Yes      | -        | 代理商订单号   |
| **reason** | string   | Yes      | -        | 退款原因或理由 |

## 8. 新闻媒体订单申请补发

> ⚠️ **注意**：仅支持包收录资源订单，在未被收录且在有效时间段内时（发布或补发后：12小时~7天），才可以申请补发。

- **请求路径**：`/media/order/apply-republish`
- **请求方式**：`POST`

### 请求参数说明

| **名称** | **类型** | **必填** | **默认** | **说明**     |
| -------- | -------- | -------- | -------- | ------------ |
| **sn**   | string   | Yes      | -        | 代理商订单号 |

## 9. 查询新闻媒体订单

- **请求路径**：`/media/order/query`
- **请求方式**：`GET`

### 请求参数说明

| **名称** | **类型** | **必填** | **默认** | **说明**                                   |
| -------- | -------- | -------- | -------- | ------------------------------------------ |
| **sn**   | list     | Yes      | -        | 代理商新闻媒体订单号列表，最大长度限制为20 |

### 响应数据说明（data 列表元素）

| **名称**         | **类型**     | **说明**                                                     |
| ---------------- | ------------ | ------------------------------------------------------------ |
| **sn**           | string       | 代理商新闻媒体订单号                                         |
| **url**          | string\|null | 发布网址，未发布时为null                                     |
| **screenshot**   | string\|null | 发布截图HTML内容。 ⚠️ *由于数据来自用户，请在展示时考虑XSS，CSRF等安全问题。* |
| **published_at** | date\|null   | 发布时间，未发布时为null                                     |
| **status**       | int          | 状态，参见 [附录：订单状态](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#24-附录订单状态) |
| **feedback**     | dict\|null   | 订单最后一步操作反馈数据，因订单状态而异，参见 [附录：订单反馈信息](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#25-附录订单反馈信息) |

## 10. 获取自媒体资源

- **请求路径**：`/we-media/resource`
- **请求方式**：`GET`

### 请求参数说明

| **名称** | **类型** | **必填** | **默认** | **说明**                |
| -------- | -------- | -------- | -------- | ----------------------- |
| **page** | int      | No       | 1        | 页码                    |
| **size** | int      | No       | 20       | 每页个数，最大限制为200 |

### 响应数据说明（data 字典元素）

| **名称**  | **类型** | **说明** |
| --------- | -------- | -------- |
| **total** | int      | 资源总数 |
| **items** | list     | 资源列表 |

### 响应数据说明（data['items'] 列表元素）

| **名称**              | **类型**      | **说明**                                                     |
| --------------------- | ------------- | ------------------------------------------------------------ |
| **id**                | int           | 资源标识                                                     |
| **name**              | string        | 资源名称                                                     |
| **entrance_link**     | string\|null  | 入口链接                                                     |
| **case_link**         | string        | 案例链接                                                     |
| **remark**            | string\|null  | 备注说明                                                     |
| **price**             | decimal(10,2) | 图文成本价格，单位：元                                       |
| **video_price**       | decimal(10,2) | 视频成本价格，单位：元                                       |
| **trend_price**       | decimal(10,2) | 动态（微头条）成本价格，单位：元                             |
| **published_avg**     | int           | 平均发稿时间，单位：分钟                                     |
| **published_rate**    | int           | 发稿率，0 ~ 100                                              |
| **platform**          | int           | 所属平台，参见 [附录：所属平台](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#21-附录所属平台) |
| **area**              | int           | 所属地区                                                     |
| **industry_category** | int           | 行业分类，参见 [附录：行业分类](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#22-附录行业分类) |
| **fans_number**       | int           | 参考粉丝数： 1: 0-1000 \| 2: 1001-5000 \| 3: 5001-1万 4: 1万-5万 \| 5: 5万-10万 \| 6: 10万-100万 7: 100万-500万 \| 8: 5001万-1000万 \| 9: 1000万以上 |
| **read_number**       | int           | 参考阅读数： 1: 0-1000 \| 2: 1001-5000 \| 3: 5001-1万 4: 1万-5万 \| 5: 5万-10万 \| 6: 10万以上 |
| **like_number**       | int           | 参考点赞数： 1: 0-1000 \| 2: 1001-5000 \| 3: 5001-1万 4: 1万-5万 \| 5: 5万-10万 \| 6: 10万以上 |
| **publish_daily**     | int           | 每日可发篇数： 1: 1篇 \| 2: 2篇 \| 3: 3篇 \| 5: 5篇 \| 10: 10篇 \| 255: 不限量篇 |
| **is_authenticated**  | boolean       | 是否已认证                                                   |
| **is_official**       | boolean       | 是否为官方自媒体                                             |
| **can_video**         | boolean       | 是否支持发视频                                               |
| **can_trend**         | boolean       | 是否支持发动态（微头条）                                     |
| **can_weekend**       | boolean       | 周末是否可以发稿                                             |
| **status**            | int           | 状态，参见 [附录：资源状态](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#23-附录资源状态) |

## 11. 查询自媒体资源

- **请求路径**：`/we-media/resource/query`
- **请求方式**：`GET`

### 请求参数说明

| **名称** | **类型** | **必填** | **默认** | **说明**                      |
| -------- | -------- | -------- | -------- | ----------------------------- |
| **id**   | list     | Yes      | -        | 资源id列表，最大长度限制为200 |

> **说明**：响应数据 `data` 为有效资源列表，详情数据字段说明与 **获取自媒体资源** 接口返回的 `data['items']` 列表一致。

## 12. 创建自媒体订单

- **请求路径**：`/we-media/order`
- **请求方式**：`POST`

### 请求参数说明

| **名称**            | **类型** | **必填** | **默认** | **说明**                                                     |
| ------------------- | -------- | -------- | -------- | ------------------------------------------------------------ |
| **sn**              | string   | Yes      | -        | 代理商订单号，必须唯一且最大长度限制为64                     |
| **resource_id**     | int      | Yes      | -        | 资源id                                                       |
| **title**           | string   | Yes      | -        | 稿件标题，最大长度限制为200，**需要urlencode处理。**         |
| **content**         | string   | Yes      | -        | 稿件内容预览地址，必须为正确的URL格式，**需要urlencode处理。** |
| ~~publish_limited~~ | ~~date~~ | ~~No~~   | ~~null~~ | 🔴 **自2026年4月10日起，自媒体不再支持限时发布。**            |
| **remark**          | string   | No       | null     | 备注说明，最大长度限制为500，**需要urlencode处理。**         |
| **owner**           | string   | No       | null     | 稿件所属客户，最大长度限制为100，**需要urlencode处理。**     |
| **publish_form**    | int      | Yes      | -        | 发布形式： 1: 图文发布 2: 优先图文发布，未通过则截图发布     |
| **publish_type**    | int      | Yes      | -        | 发布类型： 1: 图文 2: 视频 3: 动态                           |
| **account_rule**    | int      | Yes      | -        | 发布规则： 2: 只允许更换同类型账号发布 3: 不允许换号发布     |

### 响应数据说明（data 字典元素）

| **名称**       | **类型** | **说明**               |
| -------------- | -------- | ---------------------- |
| **partner_sn** | string   | 超级媒介订单号（26位） |

## 13. 自媒体订单催稿

- **请求路径**：`/we-media/order/urge`
- **请求方式**：`POST`

### 请求参数说明

| **名称** | **类型** | **必填** | **默认** | **说明**     |
| -------- | -------- | -------- | -------- | ------------ |
| **sn**   | string   | Yes      | -        | 代理商订单号 |

## 14. 自媒体订单取消

> ⚠️ **注意**：只有状态为**待处理**的订单才可取消。

- **请求路径**：`/we-media/order/cancel`
- **请求方式**：`POST`

### 请求参数说明

| **名称**   | **类型** | **必填** | **默认** | **说明**       |
| ---------- | -------- | -------- | -------- | -------------- |
| **sn**     | string   | Yes      | -        | 代理商订单号   |
| **reason** | string   | Yes      | -        | 取消原因或理由 |

## 15. 自媒体订单申请退款

> ⚠️ **注意**：如果在发布中申请退款，不保证一定退款成功，最终以编辑为准。

- **请求路径**：`/we-media/order/apply-refund`
- **请求方式**：`POST`

### 请求参数说明

| **名称**   | **类型** | **必填** | **默认** | **说明**       |
| ---------- | -------- | -------- | -------- | -------------- |
| **sn**     | string   | Yes      | -        | 代理商订单号   |
| **reason** | string   | Yes      | -        | 退款原因或理由 |

## 16. 查询自媒体订单

- **请求路径**：`/we-media/order/query`
- **请求方式**：`GET`

### 请求参数说明

| **名称** | **类型** | **必填** | **默认** | **说明**                                 |
| -------- | -------- | -------- | -------- | ---------------------------------------- |
| **sn**   | list     | Yes      | -        | 代理商自媒体订单号列表，最大长度限制为20 |

> **说明**：响应数据字段定义与 [查询新闻媒体订单](https://gemini.google.com/app/6eb769223c518f1c?hl=en-US&_gl=1*118ss2b*_gcl_aw*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_dc*R0NMLjE3NjUzNzA3NTAuQ2p3S0NBaUEwZVRKQmhCYUVpd0EtUGEtaGZZR3FZVXlxLXR0dlZCY3pPb01xZlhvMFB2dUlTLUlBaUE3QmIyV1RRazBvdjlPOTU0bnBSb0Myb0VRQXZEX0J3RQ..*_gcl_au*Njg3ODA0MjU2LjE3NjM4NzMyNjA.*_up*MQ..*_ga*MTU1MTQ1ODkzMS4xNzYzODczMjY0*_ga_WC57KJ50ZZ*czE3NjUzNzA3NDUkbzIkZzEkdDE3NjUzNzA3NDkkajU2JGwwJGgw&gclid=CjwKCAiA0eTJBhBaEiwA-Pa-hfYGqYUyq-ttvVBczOoMqfXo0PvuIS-IAiA7Bb2WTQk0ov9O954npRoC2oEQAvD_BwE&gclsrc=aw.ds&gbraid=0AAAAAC_C9PTltGxV2tdv0ly42wUA92nU3#9-查询新闻媒体订单) 保持一致。

## 17. 事件通知

> ⚠️ **注意**：数据签名方式与请求接口时相同。

- **回调地址**：用户设置的**事件通知URL**
- **回调方式**：`POST`

### 回调参数说明

| **名称**    | **类型** | **必填** | **说明**                                 |
| ----------- | -------- | -------- | ---------------------------------------- |
| **event**   | int      | Yes      | 事件类型： 1: 资源变更 2: 订单变更       |
| **payload** | dict     | Yes      | 事件数据，因事件类型不同而异，见下方说明 |

#### 17.1 事件类型为「资源变更」时，payload 字段说明：

| **名称** | **类型** | **必填** | **说明**                                                 |
| -------- | -------- | -------- | -------------------------------------------------------- |
| **type** | int      | Yes      | 资源类型： 1: 新闻媒体 2: 自媒体                         |
| **id**   | int      | Yes      | 资源id，可以通过此参数调用资源查询接口来更新本地资源数据 |

#### 17.2 事件类型为「订单变更」时，payload 字段说明：

| **名称** | **类型** | **必填** | **说明**                                                     |
| -------- | -------- | -------- | ------------------------------------------------------------ |
| **type** | int      | Yes      | 资源类型： 1: 新闻媒体 2: 自媒体                             |
| **sn**   | string   | Yes      | 代理商订单号，可以通过此参数调用订单查询接口来更新本地订单数据 |

## 18. 附录：所属地区

| **值**  | **标签** | **值** | **标签** | **值** | **标签** |
| ------- | -------- | ------ | -------- | ------ | -------- |
| **100** | 综合全国 | **11** | 浙江     | **23** | 海南     |
| **1**   | 北京     | **12** | 安徽     | **24** | 云南     |
| **2**   | 天津     | **13** | 福建     | **25** | 青海     |
| **3**   | 上海     | **14** | 江西     | **26** | 陕西     |
| **4**   | 重庆     | **15** | 山东     | **27** | 新疆     |
| **5**   | 河北     | **16** | 河南     | **28** | 宁夏     |
| **6**   | 山西     | **17** | 湖北     | **29** | 内蒙古   |
| **7**   | 辽宁     | **18** | 湖南     | **30** | 西藏     |
| **8**   | 吉林     | **19** | 广东     | **31** | 广西     |
| **9**   | 黑龙江   | **20** | 甘肃     | **32** | 港澳台   |
| **10**  | 江苏     | **21** | 四川     | **33** | 海外     |
|         |          | **22** | 贵州     |        |          |

## 19. 附录：频道类型

| **值** | **标签** | **值** | **标签** | **值**  | **标签** |
| ------ | -------- | ------ | -------- | ------- | -------- |
| **1**  | IT科技   | **9**  | 健康医疗 | **17**  | 体育运动 |
| **2**  | 生活消费 | **10** | 房产家居 | **18**  | 食品餐饮 |
| **3**  | 女性时尚 | **11** | 财经商业 | **19**  | 工业贸易 |
| **4**  | 娱乐休闲 | **12** | 新闻资讯 | **20**  | 亲子母婴 |
| **5**  | 游戏网站 | **13** | 套餐系列 | **21**  | 慈善公益 |
| **6**  | 汽车网站 | **14** | 最新秒杀 | **100** | 其他频道 |
| **7**  | 教育培训 | **15** | 十元专区 |         |          |
| **8**  | 酒店旅游 | **16** | 文化艺术 |         |          |

## 20. 附录：综合门户

| **值** | **标签** | **值** | **标签**   | **值** | **标签**       |
| ------ | -------- | ------ | ---------- | ------ | -------------- |
| **1**  | 新浪网   | **11** | 中国网     | **21** | 光明网         |
| **2**  | 搜狐网   | **12** | 慧聪网     | **22** | 环球网         |
| **3**  | 腾讯网   | **13** | 大众网     | **23** | 国际在线       |
| **4**  | 网易网   | **14** | 东方网     | **24** | 中国青年网     |
| **5**  | 凤凰网   | **15** | 中国日报网 | **25** | 人民日报客户端 |
| **6**  | 中华网   | **16** | 中国经济网 | **27** | 官方百家号     |
| **7**  | 人民网   | **17** | 中国新闻网 | **29** | 垂直媒体       |
| **8**  | 央视网   | **18** | 中国广播网 | **30** | 其他门户       |
| **9**  | 千龙网   | **19** | 和讯网     | **31** | 海外媒体       |
| **10** | 新华网   | **20** | 北青网     |        |                |

## 21. 附录：所属平台

| **值** | **标签** | **值** | **标签**   | **值** | **标签**   |
| ------ | -------- | ------ | ---------- | ------ | ---------- |
| **1**  | 腾讯号   | **9**  | 新浪号     | **17** | 车家号     |
| **2**  | 哔哩哔哩 | **10** | 小红书     | **18** | 中金在线号 |
| **3**  | 网易号   | **11** | 知乎号     | **19** | 雪球号     |
| **4**  | 搜狐网   | **12** | zaker      | **20** | 凤凰号     |
| **5**  | 百家号   | **13** | 豆瓣       | **21** | 微信公众号 |
| **6**  | 今日头条 | **14** | UC头条     | **23** | 简书       |
| **7**  | 微博     | **15** | 东方头条   | **24** | 懂车帝     |
| **8**  | 一点资讯 | **16** | 东方财富号 | **22** | 其他       |

## 22. 附录：行业分类

| **值** | **标签** | **值** | **标签** | **值**  | **标签** |
| ------ | -------- | ------ | -------- | ------- | -------- |
| **1**  | 文化     | **10** | 健康     | **19**  | 房产     |
| **2**  | 历史     | **11** | 教育     | **20**  | 职场     |
| **3**  | 三农     | **12** | 母婴     | **21**  | 情感     |
| **4**  | 财经     | **13** | 美食     | **22**  | 搞笑     |
| **5**  | 科技     | **14** | 旅游     | **23**  | 新闻     |
| **6**  | 体育     | **15** | 公益     | **24**  | 家居     |
| **7**  | 汽车     | **16** | 游戏     | **25**  | 生活     |
| **8**  | 娱乐     | **17** | 动漫     | **100** | 其他     |
| **9**  | 时尚     | **18** | 社会     |         |          |

## 23. 附录：资源状态

> ⚠️ **注意**：除了**已通过**之外，其他均表示未上架。

| **状态** | **标签** |
| -------- | -------- |
| **1**    | 审核中   |
| **2**    | 已通过   |
| **3**    | 未通过   |
| **4**    | 已暂停   |
| **5**    | 已取消   |

## 24. 附录：订单状态

> ⚠️ **注意**：**补发中**、**已补发**、**已收录** 三种状态为新闻媒体订单所独有。

| **值** | **标签** | **值** | **标签** |
| ------ | -------- | ------ | -------- |
| **1**  | 待处理   | **7**  | 已退款   |
| **2**  | 已拒稿   | **8**  | 退款被拒 |
| **3**  | 发布中   | **9**  | 已关闭   |
| **4**  | 已发布   | **10** | 补发中   |
| **5**  | 已取消   | **11** | 已补发   |
| **6**  | 退款中   | **12** | 已收录   |

## 25. 附录：订单反馈信息

> 当订单状态为 **待处理**、 **发布中**、 **已退款** 时，`feedback` 值为 `null`。其他状态见下表：

#### 25.1 订单状态为：已取消、退款中、补发中、已拒稿、退款被拒、已关闭

| **名称**   | **类型** | **说明**         |
| ---------- | -------- | ---------------- |
| **reason** | string   | 操作的原因或理由 |

#### 25.2 订单状态为：已完成、已补发

| **名称**       | **类型** | **说明**                                                     |
| -------------- | -------- | ------------------------------------------------------------ |
| **url**        | string   | 发布网址                                                     |
| **screenshot** | string   | 发布截图HTML内容。 ⚠️ *由于数据来自用户，请在展示时考虑XSS，CSRF等安全问题。* |

#### 25.3 订单状态为：已收录

| **名称**       | **类型** | **说明**                                                     |
| -------------- | -------- | ------------------------------------------------------------ |
| **screenshot** | string   | 收录截图HTML内容。 ⚠️ *由于数据来自用户，请在展示时考虑XSS，CSRF等安全问题。* |