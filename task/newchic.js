const async=require('async');
const request=require('request');
const superagent=require('superagent');
const cheerio=require('cheerio');
const Function=require('../api/functions');
let Dbapi = require('../api/dbapi');
const homeUrl='https://www.newchic.com/';
let $headers = {
    'accept-language':'zh-CN,zh;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36'
};
let categorys=[];
let requestCategorys=[];
let items=[];
const WID = '';
function newchic() {
    function getCategory(callback) {
        superagent
            .get(homeUrl)
            .set($headers)
            .end((req,res) => {
                parseCategory(res.text,function (err) {
                    callback(err);
                });
            })
            .on('error',(err) => {
                console.log('!!! error',err);
            });
    }

    function parseCategory(body,callback) {
        let $=cheerio.load(body);
        $("div.channel li").each( function(index,element) {
            if (index!==0) {
                let categoryItem={};
                let parent_url=homeUrl+$(this).find("b a").attr("href");
                categoryItem.url=parent_url;
                categoryItem.name=$(this).find("b a").text().trim();
                let secondCategorys=[];
                let secondCategoryItem={};
                secondCategoryItem.threadCategoryItems=[];
                let secondCategoryUrl='';
                $(this).find("a").each(function(i1,e1) {
                    let title_class=$(this).attr("class");
                    if (title_class!=="bold" && i1!==0 && title_class!=="red " && title_class!==" ") {
                        if (title_class==='title' || title_class===" title") {
                            if(secondCategoryItem.threadCategoryItems.length!==0 || secondCategoryItem && secondCategoryItem.name ) {
                                //console.log(secondCategoryItem);
                                if (secondCategoryItem.threadCategoryItems.length===0) {
                                    delete secondCategoryItem.threadCategoryItems;
                                }
                                secondCategorys.push(secondCategoryItem);
                                secondCategoryItem={};
                                secondCategoryItem.threadCategoryItems=[];
                            }
                            secondCategoryUrl=$(this).attr("href");
                            secondCategoryItem.url=secondCategoryUrl;
                            secondCategoryItem.parent_url=parent_url;
                            secondCategoryItem.parent_name=categoryItem.name;
                            secondCategoryItem.name=$(this).text().trim();
                        } else {
                            if (secondCategoryItem.name) {
                                let threadClassItem={};
                                threadClassItem.url=$(this).attr("href");
                                threadClassItem.name=$(this).text().trim();
                                threadClassItem.parent_url=secondCategoryUrl;
                                threadClassItem.parent_name=secondCategoryItem.name;
                                // console.log(threadClassItem);
                                secondCategoryItem.threadCategoryItems.push(threadClassItem);
                            } else {
                                let secondClassItem_$={};
                                secondClassItem_$.url=$(this).attr("href");
                                secondClassItem_$.name=$(this).text().trim();
                                secondClassItem_$.parent_url=parent_url;
                                secondClassItem_$.parent_name=categoryItem.name;
                                //console.log(secondClassItem_$);
                                secondCategorys.push(secondClassItem_$);
                            }
                        }
                    }
                });
                if (secondCategoryItem.threadCategoryItems.length!==0) {
                    //console.log(secondCategoryItem);
                    secondCategorys.push(secondCategoryItem);
                }
                if (secondCategorys.length!==0) {
                    categoryItem.sencodCategoryItems=secondCategorys;
                }
                categorys.push(categoryItem);
            }
        });

        for (let i=0;i<categorys.length;i++) {
            if (categorys[i].sencodCategoryItems.length!==0) {
                for (let j=0;j< categorys[i].sencodCategoryItems.length;j++) {
                    let sencodCategory=categorys[i].sencodCategoryItems[j];
                    if (sencodCategory.hasOwnProperty("threadCategoryItems")) {
                        for (let k=0;k<sencodCategory.threadCategoryItems.length;k++) {
                            let threadCategory=sencodCategory.threadCategoryItems[k];
                            requestCategorys.push(threadCategory);
                        }
                    } else {
                        requestCategorys.push(sencodCategory);
                    }
                }
            }
        }
        callback(null);
    }

    this.testRun=function () {
        getCategory((err) => {
            console.log(categorys[9]);
            console.log(categorys.length);
            console.log('++++++requestCategorys++++');
            // requestCategorys.forEach((item,index,arr) => {
            //     console.log(item);
            // });
            console.log(requestCategorys.length);
    });
    };
}
module.exports=new newchic();