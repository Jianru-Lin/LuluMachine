# LuluMachine 是什么？
LuluMachine 是一个在线的可视化「文本解析(Parsing)」算法实验平台。你可以通过它快速掌握文本解析技术（好吧其实也不可能马上掌握，但真的比过去快多了，请相信我）。
目前你已经可以在这一平台上实验文本解析技术中的「词法分析(Lexical analysis)」技术了。「语法分析(Syntactic analysis)」部分还在开发中。

# 它好在哪？
* 能够以「可视化」方式在「字符级」观察记号分割过程，形象直观
* 只要会 JavaScript 就能写算法，不要求预先掌握自动机方面的背景知识（当然如果你有相关背景，那么你会更深刻的认识到 LuluMachine 是如何帮助你将理论对应到实践的）
* 能够造出非常强大的解析算法，

# 为什么不使用 Flex/Bison/ANTLR...？
别误会，这个平台不是用来取代现有的成熟工具的（当然我非常希望它在未来某一天也能独挡一面）。和许多现有的工具不同，LuluMachine 并不是围绕性能为核心设计的，而是重在通过可视化的方式阐释一些看似神秘的技术背后简单的一面。因此请记住，这是一个帮助你我更好的理解理论的一个平台，而不是应用于生产环境的一个工具。

# 分析能力级别如何？LL(k)？或者只有LL(1)？
不，LuluMachine 不止能够分析正则语言，还能够分析上下文无关语言以及上下文相关语言。这只受限于你的算法。这一点和你熟知的 Flex/Bison 不同，因为 LuluMachine 是你通过手工构造的，它利用了 JavaScript 语言本身的能力，因此不仅仅是一个简单的有限状态机（仅仅能分析正则语言），或者下推自动机（稍微强一些能分析上下文无关语言），而是
