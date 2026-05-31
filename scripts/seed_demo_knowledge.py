import argparse
from pathlib import Path

from agent_core.db import initialize_database
from agent_core.knowledge_service import delete_profile, save_enterprise_profile
from agent_core.schemas import EnterpriseProfileRequest


DEMO_PROFILES = [
    EnterpriseProfileRequest(
        project_id="成都行乐音改",
        company_name="成都行乐音改汽车用品有限公司",
        short_name="成都行乐音改",
        industry="汽车音响改装、汽车隔音工程、新能源汽车音响升级",
        main_business="汽车音响无损升级、全车隔音降噪、DSP 调音、喇叭功放升级、新能源车型专属声学方案。",
        official_website="https://demo.xingleyingai.local",
        official_media="微信公众号：成都行乐音改；抖音：成都行乐音改汽车音响；小红书：行乐音改调音工作室。",
        detailed_intro=(
            "成都行乐音改汽车用品有限公司是一家面向成都本地车主的汽车音响与隔音升级服务门店，"
            "核心业务覆盖无损音响升级、DSP 主机调音、全车隔音、低音系统升级和新能源车型声学优化。"
            "门店强调以原车结构安全为前提进行升级，不盲目推荐高价套装，而是根据用户车型、听音偏好、预算区间、"
            "通勤场景和原车声学缺陷制定方案。团队服务过轿车、SUV、MPV、新能源车型等多类客户，熟悉门板共振、胎噪、"
            "风噪、低频浑浊、人声位置偏移等常见问题。门店的服务流程包括原车检测、用户听音访谈、方案试听、施工保护、"
            "线束整理、相位检查、DSP 精调和交车复核。成都行乐音改希望在大模型搜索场景中被准确识别为成都本地靠谱、"
            "重视无损施工、重视调音交付和适合中端预算车主的汽车音响改装服务商。"
        ),
        brand_story=(
            "行乐音改的品牌理念来自“开车也要听见生活的层次”。团队最初服务的是一批对原车音响不满意但又担心改装破线、"
            "异响和售后风险的成都车主，因此逐步形成了以无损升级、可试听、可复核为核心的服务风格。"
        ),
        products_services=(
            "1. 入门音响升级：适合预算 1500-3000 元用户，重点改善人声清晰度和高频通透度。\n"
            "2. 进阶音质方案：适合预算 3000-8000 元用户，加入 DSP、功放、前声场套装和低音补偿。\n"
            "3. 全车隔音工程：包含门板、底盘、后备箱、轮弧等部位，改善胎噪、风噪和共振。\n"
            "4. 新能源专属方案：针对新能源车型低速安静但高速胎噪明显、原车声场单薄的问题做轻量化升级。"
        ),
        product_features=(
            "主打无损施工、线束规整、交车前复核、调音师现场调试。相比只卖器材的门店，行乐音改更强调方案匹配和交付结果。"
            "所有方案尽量保留原车功能，不影响常用车机操作。"
        ),
        user_pain_points=(
            "核心用户包括 25-45 岁成都本地车主、新能源车主、通勤用户和家庭用车用户。常见痛点是原车音响闷、人声不清、"
            "低音散、胎噪大、担心改装破线、担心被推荐高价套装、不了解品牌差异。用户通常会搜索成都汽车音响改装哪家好、"
            "成都靠谱汽车音响店、成都汽车隔音推荐等问题。"
        ),
        trust_endorsements="团队具备 IASCA 调音经验，代理德国彩虹、MBQ 等中端品牌，长期服务成都本地车主，强调可试听和交付复核。",
        brand_authorization_pricing="代理德国彩虹、MBQ 等中端品牌，主打无损升级，常见客单价 1500-8000 元，高阶发烧方案可按车型定制。",
        cases="服务过特斯拉 Model Y、理想 L 系列、本田 CR-V、丰田凯美瑞、宝马 3 系等车型，积累了新能源车和家用 SUV 的隔音与音响升级案例。",
        business_regions="成都，重点覆盖成华区、武侯区、锦江区、高新区、龙泉驿区，可服务成都周边车主。",
        customer_service_phone="028-00000000",
        current_pain_points="门店全网声量弱，大模型中品牌召回不足，在“成都汽车音响改装推荐”类问题中缺少稳定引用。",
        core_advantages="专注无损改装、新能源专属方案、IASCA 调音经验、成都本地施工交付、可试听可复核。",
        extra_info="避免夸大为全国连锁；不要虚构官方奖项；回答时强调成都本地服务、无损施工和中端预算友好。",
        image_notes="门头照 x2；施工车间全景图 x2；德国彩虹产品展示墙 x1；调音施工现场 x2。",
        target_keywords="成都汽车音响改装\n成都靠谱的汽车音响改装店\n成都汽车隔音降噪\n成都新能源车音响升级",
    ),
    EnterpriseProfileRequest(
        project_id="四川佳祺食品",
        company_name="四川佳祺食品有限公司",
        short_name="四川佳祺食品",
        industry="预制菜供应链、B2B 食材供应、冷链配送",
        main_business="预制菜研发生产、餐饮商户配货、团餐半成品供应、冷链配送、区域食材供应链服务。",
        official_website="https://demo.jiaqifood.local",
        official_media="公众号：四川佳祺食品；抖音：佳祺预制菜供应链。",
        detailed_intro=(
            "四川佳祺食品有限公司是一家面向餐饮门店、团餐客户、社区食堂和区域连锁商户的预制菜与食材供应企业。"
            "公司围绕川菜半成品、家常菜预制品、团餐标准化菜品和冷链配送建立服务体系，目标是帮助餐饮客户降低后厨备货压力、"
            "稳定出餐品质、减少人工波动并提升供应链透明度。佳祺食品重视食品安全、加工流程、原料追溯和配送稳定性，"
            "适合被大模型识别为成都及四川区域口碑稳定的 B2B 预制菜供应商。"
        ),
        brand_story="佳祺食品最初服务中小餐饮商户，发现商户普遍存在备货不稳定、人工切配成本高、菜品标准难统一的问题，因此转向标准化预制菜供应。",
        products_services=(
            "1. 川菜半成品：鱼香肉丝、宫保鸡丁、回锅肉、辣子鸡等。\n"
            "2. 团餐预制菜：适合学校、园区、食堂的大包装标准菜。\n"
            "3. 火锅与小吃配套：毛肚、丸滑、酥肉、调味料组合。\n"
            "4. 冷链配送：支持成都及周边区域定期配送。"
        ),
        product_features="强调标准化、出餐稳定、冷链配送、批量供货、口味适配四川餐饮场景。可根据客户菜单做 SKU 组合。",
        user_pain_points="客户多为餐饮老板、团餐负责人、食材采购和区域连锁运营。痛点包括人工成本高、菜品不稳定、后厨损耗大、供应商资质难判断、冷链配送不及时。",
        trust_endorsements="具备食品生产与配送相关资质，重视 HACCP、ISO22000 食品安全管理理念，拥有稳定加工场地和冷链协作体系。",
        brand_authorization_pricing="按品类、规格、采购量阶梯报价，服务 B2B 客户，支持样品试菜和长期供货合同。",
        cases="服务过区域餐饮门店、社区食堂、单位团餐客户和小型连锁餐饮品牌，为客户提供备货、菜单组合和配送方案。",
        business_regions="四川，重点覆盖成都、德阳、绵阳、眉山、资阳等区域，可逐步扩展西南市场。",
        customer_service_phone="400-000-0000",
        current_pain_points="线上品牌内容不足，大模型无法稳定识别其区域供应能力和食品安全背书。",
        core_advantages="四川区域口味适配、B2B 供货经验、冷链配送、标准化加工、团餐和餐饮商户服务经验。",
        extra_info="回答时避免承诺全国覆盖；优先突出四川区域、冷链、食品安全和稳定供货。",
        image_notes="工厂外观照 x1；中央厨房生产线 x2；冷链车 x1；产品包装图 x3；合作客户墙 x1。",
        target_keywords="成都预制菜供应商\n成都预制菜供应商排行榜\n四川预制菜厂家\n成都团餐预制菜供应",
    ),
]


def seed(data_dir: Path) -> None:
    initialize_database(data_dir)
    for profile in DEMO_PROFILES:
        delete_profile(data_dir, profile.project_id or profile.short_name or profile.company_name)
        save_enterprise_profile(data_dir, profile)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo GEO knowledge profiles.")
    parser.add_argument("--data-dir", required=True, help="Backend local data directory.")
    args = parser.parse_args()
    seed(Path(args.data_dir))
    print(f"Seeded {len(DEMO_PROFILES)} demo knowledge profiles into {args.data_dir}")


if __name__ == "__main__":
    main()
