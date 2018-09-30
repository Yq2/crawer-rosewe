const async=require('async');
const request=require('request');
const superagent=require('superagent');
const cheerio=require('cheerio');
const Function=require('../api/functions');
let Dbapi = require('../api/dbapi');
const homeUrl='https://www.rosewe.com/';
let $headers = {
    'accept-language':'zh-CN,zh;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36'
};
const WID = 2050;
let categorys=[];
let requestCategorys=[];
let items=[];
function rosewe() {
    function getCategory(callback) {
        let headers=Function.obj_copy($headers);
        superagent
            .get(homeUrl)
            .set(headers)
            .end((req,res) => {
                parseCategory(res.text,function (err) {
                    callback(err);
                });
            })
            .on('error',(err) => {
                console.log('!!! error',err);
            });
        // let requestParams={
        //     url:homeUrl,
        //     method:'GET',
        //     headers:headers
        // };
        // request(requestParams,(err,res,body) => {
        //     // console.log(body)
        //     parseClassify(body);
        // });
    }
    function parseCategory(body,callback) {
        let $=cheerio.load(body);
        $("ul[id='TS_menu']").find("li").each( function(index,element) {
            if (index!==0) {
                let categoryItem={};
                let parent_url=homeUrl+$(this).find("a[class='cat_name']").attr("href");
                categoryItem.url=parent_url;
                categoryItem.name=$(this).find("a[class='cat_name']").text().trim();
                let secondCategorys=[];
                let secondCategoryItem={};
                secondCategoryItem.threadCategoryItems=[];
                let secondCategoryUrl='';
                $(this).find("dt[class='second_cal_list']").each(function(index,element) {
                    if (index!==0) {
                        let style=$(this).find("a").attr("style");
                        if (style==="font-weight:bold;") {
                            if(secondCategoryItem.threadCategoryItems.length!==0) {
                                secondCategorys.push(secondCategoryItem);
                                secondCategoryItem={};
                                secondCategoryItem.threadCategoryItems=[];
                            }
                            secondCategoryUrl=homeUrl+$(this).find("a").attr("href");
                            secondCategoryItem.url=secondCategoryUrl;
                            secondCategoryItem.parent_url=parent_url;
                            secondCategoryItem.name=$(this).find("a").text().trim();
                        } else {
                            if (secondCategoryItem.name) {
                                let threadClassItem={};
                                threadClassItem.url=homeUrl+$(this).find("a").attr("href");
                                threadClassItem.name=$(this).find("a").text().trim();
                                threadClassItem.parent_url=secondCategoryUrl;
                                secondCategoryItem.threadCategoryItems.push(threadClassItem);
                            } else {
                                let secondClassItem_$={};
                                secondClassItem_$.url=homeUrl+$(this).find("a").attr("href");
                                secondClassItem_$.name=$(this).find("a").text().trim();
                                secondClassItem_$.parent_url=parent_url;
                                secondCategorys.push(secondClassItem_$);
                            }
                        }
                    }
                });
                if (secondCategoryItem.threadCategoryItems.length!==0) {
                    secondCategorys.push(secondCategoryItem);
                }
                categoryItem.sencodCategoryItems=secondCategorys;
                categorys.push(categoryItem);
            }
        });
        callback(null);
    }
    function sendCategory(callback) {
        async.waterfall([
            function (cb) {
                getCategory(function (err) {
                    console.log('categorys=',categorys.length);
                    cb(err);
                });
            },
            function (cb) {
                sendFirstCategory(function (err,result) {
                    //console.log('Dbapi.sendMsg err', err, 'result', result);
                    let list_category=result.list.category;
                    list_category.forEach((item,index,arr) => {
                        console.log(JSON.stringify(item));
                        // categorys.forEach((e, i) => {
                        //     if (item.url===categorys[i].url) {
                        //         categorys[i].id=item.id;
                        //     }
                        // })
                    });
                    cb(err,list_category);
                });
            },
            function (list_category,cb) {
                console.log('-----准备发送的二级----');
                let dbSecondCategory=filterSecondCategory(list_category);
                dbSecondCategory.forEach((e,i) => {
                    console.log(dbSecondCategory[i]);
                });
                let seCategory = [];
                async.eachLimit(dbSecondCategory, 1, function (secondCl, cab) {
                    Dbapi.sendMsg({
                        json: {actionid: 10, noat: true, category: secondCl['category']}
                    }, function (err, result) {
                        seCategory = seCategory.concat(result.list['category']);
                        cab(null);
                    });
                }, function (err) {
                    cb(err,seCategory);
                });
            },
            function (seCategory,cb) {
                console.log('------返回的二级-----');
                console.log(seCategory);
                console.log(seCategory.length);
                let flag=true;
                categorys.forEach((e,i) => {
                    categorys[i].sencodCategoryItems.forEach((ele,ii) => {
                        if (categorys[i].sencodCategoryItems[ii].hasOwnProperty('threadCategoryItems')) {
                            seCategory.forEach((elem,iii) =>{
                                if (seCategory[iii].url === categorys[i].sencodCategoryItems[ii].name) {
                                    if (i===0) {
                                        if (ii===1 && iii===5) {
                                        } else if (ii===3 && iii===7) {
                                        }
                                        else {
                                            categorys[i].sencodCategoryItems[ii].id=seCategory[iii].id;
                                        }
                                    } else if (i===1) {
                                        if (ii===1 && iii===1) {
                                        } else if (ii===3 && iii===3) {
                                        }
                                        else {
                                            categorys[i].sencodCategoryItems[ii].id=seCategory[iii].id;
                                        }
                                    }
                                }
                            });
                        } else {
                            seCategory.forEach((elem , iii) => {
                                if (seCategory[iii].url === categorys[i].sencodCategoryItems[ii].url) {
                                    categorys[i].sencodCategoryItems[ii].id=seCategory[iii].id;
                                }
                            });
                        }
                    });
                });
                console.log('------准备发送的三级------');
                let dbThreadCategory=filterThreadCategory(seCategory);
                dbThreadCategory.forEach((e,i) => {
                    console.log(dbThreadCategory[i]);
                });
                console.log(dbThreadCategory.length);
                let threadCategory = [];
                async.eachLimit(dbThreadCategory, 1, function (secondCl, cab) {
                    Dbapi.sendMsg({
                        json: {actionid: 10, noat: true, category: secondCl['category']}
                    }, function (err, result) {
                        threadCategory = threadCategory.concat(result.list['category']);
                        cab(null);
                    });
                }, function (err) {
                    cb(err,threadCategory);
                });
            },
            function (threadCategory,cb) {
                console.log('+++++返回的三级+++++');
                console.log(threadCategory.length);
                console.log(threadCategory);
                categorys.forEach((e1,i1) => {
                    if (i1<2) {
                        categorys[i1].sencodCategoryItems.forEach((e2,i2) => {
                            categorys[i1].sencodCategoryItems[i2].threadCategoryItems.forEach((e3,i3) => {
                                threadCategory.forEach((e,i) => {
                                    if (categorys[i1].sencodCategoryItems[i2].threadCategoryItems[i3].url === threadCategory[i].url) {
                                        categorys[i1].sencodCategoryItems[i2].threadCategoryItems[i3].id=threadCategory[i].id;
                                        categorys[i1].sencodCategoryItems[i2].threadCategoryItems[i3].parent_id=categorys[i1].sencodCategoryItems[i2].id;
                                    }
                                });
                            });
                        })
                    }
                });
                console.log('++++++++++');
                //console.log(categorys[0].sencodCategoryItems[0].threadCategoryItems);
                cb();
            },
            function (cb) {
                for (let i=0;i<categorys.length;i++) {
                    for (let j=0;j< categorys[i].sencodCategoryItems.length;j++) {
                        let sencodCategory=categorys[i].sencodCategoryItems[j];
                        if (sencodCategory.hasOwnProperty("threadCategoryItems")) {
                            for (let k=0;k<sencodCategory.threadCategoryItems.length;k++) {
                                let threadCategory=sencodCategory.threadCategoryItems[k];
                                if (threadCategory.id) {
                                    requestCategorys.push(threadCategory);
                                }
                            }
                        } else {
                            if (sencodCategory.id) {
                                requestCategorys.push(sencodCategory);
                            }
                        }
                    }
                }
                console.log('++++++requestCategorys++++');
                // console.log(requestCategorys);
                console.log(requestCategorys.length);
                cb();
            }
        ],function (err) {
            callback(err);
        });
    }


    function sendFirstCategory(callback) {
        let firstClass=[];
        for (let i=0; i<categorys.length; i++){
        let item={};
        item.wid=WID;
        item.name=categorys[i].name;
        item.url=categorys[i].url;
        firstClass.push(item);
        }
        Dbapi.sendMsg(
        		{json: {actionid: 10, noat: true, category: firstClass}}
        , function (err, result) {
        		callback(err,result);
        });
    }

    function filterSecondCategory(list_category) {
        let resClass = [];
        for (let i=0;i<list_category.length;i++) {
            let childCl = [];
            for (let j=0;j<categorys.length;j++) {
                if (list_category[i].url===categorys[j].url) {
                    for (let k=0;k<categorys[j].sencodCategoryItems.length;k++) {
                        categorys[j].sencodCategoryItems[k].parent_id=list_category[i].id;
                        categorys[j].sencodCategoryItems[k].parent_url=list_category[i].url;
                        let childClass={};
                        if (categorys[j].sencodCategoryItems[k].hasOwnProperty('threadCategoryItems')) {
                            //用name 替代 url
                            childClass.url=categorys[j].sencodCategoryItems[k].name;
                        } else {
                            childClass.url=categorys[j].sencodCategoryItems[k].url;
                        }
                        childClass.parent_id=list_category[i].id;
                        childClass.parent_url=categorys[j].url;
                        childClass.name=categorys[j].sencodCategoryItems[k].name;
                        childClass.wid=WID;
                        childCl.push(childClass);
                    }
                }
            }
            if (childCl.length !== 0) resClass.push({parent_id: list_category[i].id, category: childCl})
        }
        return resClass;
    }
    
    function filterThreadCategory(list_category) {
        let resClass = [];
        for (let i=0 ;i<2; i++) {
            for (let j=0; j<categorys[i].sencodCategoryItems.length; j++) {
                if  (categorys[i].sencodCategoryItems[j].hasOwnProperty('threadCategoryItems')) {
                    for (let k=0; k<list_category.length; k++) {
                        if (list_category[k].id === categorys[i].sencodCategoryItems[j].id) {
                            let childCl=[];
                            for (let t=0 ;t< categorys[i].sencodCategoryItems[j].threadCategoryItems.length; t++) {
                                if (categorys[i].sencodCategoryItems[j].threadCategoryItems[t].name!=='Off The Shoudler') {
                                    let childClass={};
                                    childClass.url=categorys[i].sencodCategoryItems[j].threadCategoryItems[t].url;
                                    childClass.parent_id=list_category[k].id;
                                    childClass.parent_url=list_category[k].url;
                                    childClass.name=categorys[i].sencodCategoryItems[j].threadCategoryItems[t].name;
                                    childClass.wid=WID;
                                    //console.log(JSON.stringify(childClass));
                                    childCl.push(childClass);
                                }
                            }
                            if (childCl.length !== 0) resClass.push({parent_id: list_category[k].id, category: childCl})
                        }
                    }
                }
            }
        }
        return resClass;
    }

    this.run=function () {
        async.waterfall([
            function (cb) {
                sendCategory(function (err) {
                    if (err) console.log(err);
                    cb(err);
                })
            },
            function (cb) {
                Dbapi.sendMsg({json: {actionid: 15, wid: WID}}, function (err, result) {
                    console.log('============');
                    //console.log('Dbapi.allThirdGoodsList err', err, 'result', result.list.category);
                    let dbCategory=result.list.category;
                    console.log(dbCategory.length);
                    console.log(dbCategory);
                    cb(err, dbCategory);
                });
            },
            function (dbCategory,cb) {
                // dbCategory.forEach((item,index) => {
                //     requestCategorys.forEach((e,i) => {
                //         if (dbCategory[index]['@category_id'] === requestCategorys[i].id) {
                //             requestCategorys[i]['@category_id']=dbCategory[index]['@category_id'];
                //         }
                //     });
                // });
               // console.log('============');
                //console.log(requestCategorys.length);
                //console.log(requestCategorys);
                cb(null,dbCategory);
            },
            function (dbCategory,cb) {
                //读取所有的二级分类
                async.eachLimit(dbCategory , 1 ,function (category,callback) {
                    async.waterfall([
                        function (fn) {
                            console.log('category=',category);
                            //扫描分类下的所有列表
                            requestCategory(category,function (err) {
                                //console.log('category items.length=',items.length);
                                fn(err);
                            });
                        }
                    ],function (err) {
                        callback(err);
                    });
                },function (err) {
                    cb(err);
                });
                // cb();
            },
            function (cb) {
                Dbapi.sendMsg({
                    json: {
                        actionid: 32,
                        wid: WID
                    }
                }, function (err, result) {
                    console.log(err, 'Dbapi.sendMsg 32 result', JSON.stringify(result));
                    cb(null)
                })
            },
            function (cb) {
                async.eachSeries(items,function (item,cb) {
                    console.log('item=',item);
                    parseDetailPages(item,function (err,result) {
                        console.log('result =',result);
                        cb(err);
                    });
                },function (err) {
                    cb(err);
                });
            }
        ],function (err) {
            if (err) console.log(err);
        });
    };

    function requestCategory(category,callback) {
        let headers=Function.obj_copy($headers);
        let requestParam={
            url:category['@url'],
            method:'GET',
            headers:headers
        };
        request(requestParam,(err,res,body) => {
            // console.log(body);
            parseList(category,body,function (err) {
                callback(err);
            });
        });
    }

    function parseDetailPages(site,callback) {
        let headers=Function.obj_copy($headers);
        let requestParam={
            url:site.url,
            method:'GET',
            headers:headers
        };
        request(requestParam,(err,res,body) => {
            parseDetailPage(site,body,function (err,item) {
                callback(err,item);
            });
        });
    }
    function parseDetailPage(site,body,callback) {
        let $;
        let item={};
        try {
            $=cheerio.load(body);
        } catch (e) {
            console.log('parse detailpage body error');
            return callback(null,null);
        }
        if (!$) {
            console.log('parse detailpage body null');
            return callback(null,null);
        }
        item.sku=site.sku;
        item.url=site.url;
        item.count_sale='';
        item.origin_price=$("span[id='unit_price']").text();
        item.price=$("span[id='MY_PRICE']").text();
        item.img=[];
        if ('20') {
            let imgItem={};
            imgItem.type=20;
            imgItem.rul=$("img[id='original_img']").attr("src");
            item.img.push(imgItem);
        }
        if ('30') {
            $("div[class='other_Imgs']").find("a").each(function (index,ele) {
                let imgItem={};
                imgItem.type=30;
                imgItem.rul=$(this).find("img").first().attr("imgb");
                item.img.push(imgItem);
            });
        }
        item.prop=[];
        $("table[id='tb']").find("tr").each(function (index) {
            if (index===0) {
                $(this).find("td").eq(1).find("a").each(function () {
                    let propItem={};
                    propItem.type='color';
                    propItem.name=$(this).attr("title");
                    propItem.img=$(this).find("img").attr("src");
                    if (propItem.img==='javascript:;') {
                        propItem.img=$(this).attr("href");
                    }
                    item.prop.push(propItem);
                });
            }
            if (index===1) {
                $(this).find("td").eq(1).find("a").each(function () {
                    let propItem={};
                    propItem.type='size';
                    propItem.name=$(this).attr("title");
                    item.prop.push(propItem);
                });
            }
        });
        item.status=$("span[class='pointer']").first().text().split("\n")[0];
        item.count_review=$("span[class='reviewCount']").find('a').text();
        // item.manual='';
        // item.description='';
        async.waterfall([
            function (cb) {
                let dynamic='https://www.rosewe.com/dynamic.php';
                let headers=Function.obj_copy($headers);
                headers['content-type']='application/x-www-form-urlencoded';
                headers['referer']=site.url;
                let paras=site.sku;
                let dynamicParam={
                    url:dynamic,
                    method:'POST',
                    form:{
                        inserts:'goods_reviews',
                        rec_type:2,
                        paras:paras
                    },
                    headers:headers
                };
                request(dynamicParam,(err,res,body) => {
                    if (!body) {
                        console.log('!!!get goods_reviews body undefined site=',site);
                        return cb(null);
                    }
                    try {
                        let goods_reviews=JSON.parse(body);
                        item.count_review=goods_reviews.insert_goods_reviews[site.sku].reviews_nums;
                    } catch (e) {
                        console.log('!!!get goods_reviews body err site=',site);
                        console.log('---->>>>');
                        console.log(body);
                        return cb(null);
                    }
                    cb(err);
                });
            }
        ],function (err) {
            if (err) console.log(err);
            sendPageDetail(item,function (err) {
                callback(err,item);
            });
        });
    }
    
    function sendPageDetail(item,callback) {
        Dbapi.sendMsg({
            json: {
                actionid: 45,
                noat: true,
                item: item
            }
        }, function (err, result) {
            console.log('updateDetail Dbapi.sendMsg', err, result);
            callback(err)
        })
    }

    function parseList(category,body,callback) {
        let $='';
        try {
            $=cheerio.load(body);
        } catch (e) {
            console.log('parseList error');
            return callback(null);
        }
        if (!$) {
            console.log('parseList error');
            return callback(null);
        }
        //let currentPage=$("div[class='toolbar-page']").find("p").find("span[class='current']").text();
        let currentPage=$("span[class='current']").first().text();
        let pageTotal=$("div[class='toolbar-page']").find("p").find("a").length;
        //console.log('pageTotal=',pageTotal);
        if (!pageTotal) pageTotal='1';
        //console.log('pageTotal=',pageTotal);
        if (!category['pageTotal']) {
            category['pageTotal']=pageTotal;
        }
        //console.log('currentPage=',currentPage);
        $("ul[id='js_cateListUl']").find("li").each(function (index,element) {
            let item={};
            item.url=homeUrl+$(this).find("p[class='proName']").find("a").attr("href");
            item.title=$(this).find("p[class='proName']").find("a").text();
            item.icon=$(this).find("div[class='proImgBox']").find("a").find("img").attr("data-url");
            item.sku=$(this).find("p[class='proPrice']").attr("id").split('-')[2];
            item.price=$(this).find("p[class='proPrice']").find("span[class='my_shop_price']").text();
            // item.count_rank=$(this).find("p[class='proPrice']").find("div[class='g-star']").find("span").length;  //dan du ajax
            // item.pageCount=$(this).find("div[id='js_cateTopBar']").find("span[class='current']").text();
            item.pageCount=currentPage;
            // item.count_review=$(this).find("p[class='proPrice']").find("span[class='count_review']").find("a").text();   //dan du ajax
            items.push(item);
        });
        let headers=Function.obj_copy($headers);
        headers['content-type']='application/x-www-form-urlencoded';
        headers['referer']=category['@url'];
        let dynamic='https://www.rosewe.com/dynamic.php';
        let ids=[];
        for (let i=0;i<items.length;i++) {
            ids.push(items[i].sku);
        }
        let paras='';
        for (let p=0;p<ids.length;p++) {
            paras=paras+ids[p]+',';
        }
        async.waterfall([
            function (cb) {
                //console.log('ids=',ids);
                let dynamicParam={
                    url:dynamic,
                    method:'POST',
                    form:{
                        inserts:'goods_reviews',
                        rec_type:2,
                        paras:paras
                    },
                    headers:headers
                };
                request(dynamicParam,(err,res,body) => {
                    let goods_reviews=JSON.parse(body);
                    let insert_goods_reviews=goods_reviews.insert_goods_reviews;
                    // console.log(insert_goods_reviews);
                    for (let i=0;i<items.length ;i++) {
                        items[i].count_review=insert_goods_reviews[items[i].sku].reviews_nums;
                        items[i].count_rank=insert_goods_reviews[items[i].sku].reviews_points;
                    }
                    // console.log(items);
                    cb(err);
                });
            },
            function (cb) {
                let dynamicParam={
                    url:dynamic,
                    method:'POST',
                    form:{
                        inserts:'goods_favorites',
                        paras:paras
                    },
                    headers:headers
                };
                request(dynamicParam,(err,res,body) => {
                    //console.log(body);
                    let goods_reviews=JSON.parse(body);
                    let insert_goods_favorites=goods_reviews.insert_goods_favorites;
                    for (let i=0;i<items.length ;i++) {
                        let fav_nums=insert_goods_favorites[items[i].sku].fav_nums;
                        if (fav_nums.indexOf('k')===-1) {
                            items[i].count_sale=fav_nums;
                        } else {
                            let count_sale=fav_nums.replace(/k/,'');
                            items[i].count_sale=1000*count_sale;
                        }
                    }
                    cb(err);
                });
            }
        ],function (err) {
            if (err) console.log(err);
            // console.log(items);
            let nextHref='';
            $("div[class='toolbar-page']").find("p").find("a").each(function (index,ele) {
                if ($(this).text()==='Next»') {
                    nextHref=homeUrl+$(this).attr("href");
                }
            });
            console.log('currentPage=',currentPage);
            console.log('scan items.length=',items.length);
            console.log('nextHref=',nextHref);
            if (nextHref) {
                setTimeout(function () {
                    let category_next={
                        "@url":nextHref,
                        "@category_id":category['@category_id'],
                        "pageTotal":category.pageTotal
                    };
                    requestCategory(category_next,function (err) {
                        callback(err);
                    });
                },2000);
            } else {
                console.log('sendCategory list..');
                sendCategoryList(category,items,function (err) {
                    callback(err);
                });
            }
        });
    }

    function sendCategoryList(category,items,callback) {
        console.log('send items.length=',items.length);
        console.log('category.pageTotal=',category.pageTotal);
        console.log('@url=',category['@url']);
        console.log('@category_id=',category['@category_id']);
        Dbapi.sendMsg({
            json: {
                actionid: 20,
                category_id: category['@category_id'],
                page_num: category.pageTotal,
                wid: WID,
                item: items
            }
        }, function (err, result) {
            console.log('Dbapi.sendMsg categoryList err=', err, 'result=', result);
            items.length=0;
            callback(err);
        });
    }

}
module.exports=new rosewe();