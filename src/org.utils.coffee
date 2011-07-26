Org.Utils = ((Org)->

	RGX = Org.Regexps

	return
		trim: (str) -> 
			if str? and str.length then 
				str.replace(/^\s*|\s*$/g, "") 
			else ""

		repeat: (str, times) ->
			result = ""
			result += str for i in [0..times]
			return result

		each: (arr, fn) ->
			

(Org))